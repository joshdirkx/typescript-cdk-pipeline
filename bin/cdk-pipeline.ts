#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkPipelineStack } from "../stacks/cdk-pipeline-stack";

const app = new cdk.App();

new CdkPipelineStack(app, "CdkPipelineStack", {
  env: {
    account: "476136583399",
    region: "us-west-2",
  },
});

app.synth();