// MOCK Storage Layer - Replace with IoRedis / AWS-SDK in production

class MockRedis {
    private store: Map<string, string> = new Map();

    async set(key: string, value: string, ttlSeconds?: number) {
        this.store.set(key, value);
        if (ttlSeconds) {
            setTimeout(() => this.store.delete(key), ttlSeconds * 1000);
        }
    }

    async get(key: string): Promise<string | null> {
        return this.store.get(key) || null;
    }
}

class MockS3 {
    async upload(key: string, data: any) {
        console.log(`[S3] Uploaded ${key}, size=${JSON.stringify(data).length} bytes`);
    }
}

export const redis = new MockRedis();
export const s3 = new MockS3();
