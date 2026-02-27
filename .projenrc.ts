// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CdklabsConstructLibrary } from "cdklabs-projen-project-types";

const project = new CdklabsConstructLibrary({
  author: "Amazon Web Services",
  authorAddress: "https://aws.amazon.com",
  description: "Construct library for Amazon Connect Data Lake",
  keywords: ["aws", "cdk", "connect", "datalake"],
  cdkVersion: "2.240.0",
  defaultReleaseBranch: "main",
  devDeps: ["cdklabs-projen-project-types"],
  name: "@cdklabs/cdk-construct-connect-datalake",
  projenrcTs: true,
  release: false,
  bundledDeps: [
    "@aws-sdk/client-lakeformation",
    "@aws-sdk/client-glue",
    "@aws-sdk/client-connect",
    "@aws-sdk/client-ram",
    "@aws-sdk/client-sts",
    "@aws-sdk/client-cloudformation",
    "@aws-sdk/types",
    "@types/aws-lambda",
    "aws-lambda",
  ],
  prettier: true,
  prettierOptions: {
    settings: {
      printWidth: 120,
    },
  },
  eslint: true,
  tsconfig: {
    compilerOptions: {
      baseUrl: ".",
      paths: {
        "@src/*": ["src/*"],
      },
    },
  },
  jestOptions: {
    jestConfig: {
      moduleNameMapper: {
        "^@src/(.*)$": "<rootDir>/src/$1",
      },
    },
  },
  gitignore: ["cdk.out", ".idea/"],
});

project.npmignore?.exclude("cdk.out");

project.synth();
