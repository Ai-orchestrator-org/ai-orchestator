import { readFileSync } from 'fs';
import { join } from 'path';

export default {
  displayName: 'gh-pr-provider',
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
  coverageDirectory: '../../coverage/libs/gh-pr-provider',
};
