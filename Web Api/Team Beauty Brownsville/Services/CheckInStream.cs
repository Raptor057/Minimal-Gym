using System.Collections.Concurrent;
using System.Text.Json;
using System.Threading.Channels;

namespace Team_Beauty_Brownsville.Services;

public sealed class CheckInStream
{
    private readonly ConcurrentDictionary<Guid, Channel<string>> _channels = new();

    public Guid Subscribe(out ChannelReader<string> reader)
    {
        var channel = Channel.CreateUnbounded<string>();
        var id = Guid.NewGuid();
        _channels.TryAdd(id, channel);
        reader = channel.Reader;
        return id;
    }

    public void Unsubscribe(Guid id)
    {
        if (_channels.TryRemove(id, out var channel))
        {
            channel.Writer.TryComplete();
        }
    }

    public void Publish(object payload)
    {
        var json = JsonSerializer.Serialize(payload);
        foreach (var channel in _channels.Values)
        {
            channel.Writer.TryWrite(json);
        }
    }
}
