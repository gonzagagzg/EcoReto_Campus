import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// Path aliases (e.g. the ones added by `nest g library`) live in tsconfig.json,
// so they are read from there instead of being duplicated here.
const { config: tsconfig } = ts.readConfigFile(
  './tsconfig.json',
  ts.sys.readFile,
);
const paths = tsconfig?.compilerOptions?.paths ?? {};

// Las pruebas se ejecutan en CommonJS. Nota: Nest 12 y TypeORM se distribuyen como ESM,
// por lo que specs que importen @nestjs/common, TypeORM o entidades no pueden ejecutarse
// con esta configuracion; esos flujos se validan en el smoke test end-to-end.
const config: Config = {
  extensionsToTreatAsEsm: [],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        // tsconfig usa module nodenext; para las pruebas se fuerza CommonJS.
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node16',
          resolvePackageJsonExports: false,
        },
      },
    ],
  },
  moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    'libs/**/*.(t|j)s',
    'apps/**/*.(t|j)s',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
