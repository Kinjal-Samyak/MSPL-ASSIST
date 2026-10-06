import { InMemoryTtlCache } from "../../services/provider-cache";

describe("InMemoryTtlCache", () => {
  it("should_return_cached_value_before_expiry", () => {
    const cache = new InMemoryTtlCache();
    cache.set("key", "value", 300000, 1000);

    expect(cache.get("key", 2000)).toBe("value");
  });

  it("should_expire_cached_value_after_ttl", () => {
    const cache = new InMemoryTtlCache();
    cache.set("key", "value", 1000, 1000);

    expect(cache.get("key", 2500)).toBeUndefined();
  });
});

