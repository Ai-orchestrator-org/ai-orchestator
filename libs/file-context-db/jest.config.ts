export default {
  displayName: 'file-context-db',
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
  coverageDirectory: '../../coverage/libs/file-context-db',
};