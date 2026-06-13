import { readFileSync } from 'fs';
import { join } from 'path';

export default {
  displayName: 'mcp-task-storage',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  resolver: '',
  setupFiles: [],
  globals: {},
  coverageDirectory: '../../coverage/libs/mcp-task-storage',
};