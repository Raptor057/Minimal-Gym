using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("members")]
[Authorize]
public sealed class MembersController : ControllerBase
{
    private readonly IMemberRepository _members;
    private readonly IAuditService _audit;

    public MembersController(IMemberRepository members, IAuditService audit)
    {
        _members = members;
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MemberResponse>>> GetAll()
    {
        var list = await _members.GetAll();
        return Ok(list.Select(ToMemberResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<MemberResponse>> GetById(int id)
    {
        var member = await _members.GetById(id);
        return member is null ? NotFound() : Ok(ToMemberResponse(member));
    }

    [HttpPost]
    public async Task<ActionResult<MemberResponse>> Create([FromBody] MemberCreateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest("FullName is required.");
        }

        var member = new Member
        {
            FullName = request.FullName.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim(),
            BirthDate = request.BirthDate?.Date,
            EmergencyContact = request.EmergencyContact?.Trim(),
            Notes = request.Notes?.Trim(),
            PhotoBase64 = request.PhotoBase64,
            IsActive = request.IsActive,
            IsDeleted = false,
            CreatedAtUtc = DateTime.UtcNow
        };

        var id = await _members.Create(member);
        var created = await _members.GetById(id);
        await _audit.LogAsync("Create", "Member", id.ToString(), GetUserId(), new { request.FullName, request.Email, request.Phone, HasPhoto = request.PhotoBase64 is not null });
        return CreatedAtAction(nameof(GetById), new { id }, ToMemberResponse(created!));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<MemberResponse>> Update(int id, [FromBody] MemberUpdateRequest request)
    {
        var existing = await _members.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        await _members.Update(
            id,
            request.FullName?.Trim(),
            request.Phone?.Trim(),
            request.Email?.Trim(),
            request.BirthDate?.Date,
            request.EmergencyContact?.Trim(),
            request.Notes?.Trim(),
            request.PhotoBase64,
            request.IsActive,
            DateTime.UtcNow);

        var updated = await _members.GetById(id);
        await _audit.LogAsync("Update", "Member", id.ToString(), GetUserId(), new { request.FullName, request.Email, request.Phone, request.IsActive, HasPhoto = request.PhotoBase64 is not null });
        return Ok(ToMemberResponse(updated!));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _members.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        await _members.SoftDelete(id, DateTime.UtcNow);
        await _audit.LogAsync("Delete", "Member", id.ToString(), GetUserId(), null);
        return NoContent();
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
    }

    private static MemberResponse ToMemberResponse(Member member)
    {
        return new MemberResponse(
            member.Id,
            member.FullName,
            member.Phone,
            member.Email,
            member.BirthDate,
            member.EmergencyContact,
            member.Notes,
            member.PhotoBase64,
            member.IsActive);
    }
}
