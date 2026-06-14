import { readFileSync } from 'fs';
import { join } from 'path';
import { pathsToModuleNameMapper } from 'ts-jest';

const tsconfig = JSON.parse(readFileSync(join(__dirname, '../../tsconfig.base.json'), 'utf-8'));

const pathMappings = pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
  prefix: '<rootDir>/../../',
});

export default {
  displayName: 'orchestrator',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/../../tsconfig.base.json',
      diagnostics: {
        ignoreCodes: [2307, 151002],
      },
    }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: pathMappings,
  setupFiles: [],
  globals: {},
  coverageDirectory: '../../coverage/libs/orchestrator',
};