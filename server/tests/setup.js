import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetBananaProvider } from '../src/services/banana/bananaService.js';
import { resetMockBananaCursor } from '../src/services/banana/mockBanana.js';

let memoryServer;

beforeAll(async () => {
  memoryServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = memoryServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
});

afterEach(async () => {
  resetMockBananaCursor();
  resetBananaProvider();
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
});
