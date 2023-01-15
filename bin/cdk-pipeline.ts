#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkPipelineStack } from "../stacks/cdk-pipeline-stack";

const app = new cdk.App();

new CdkPipelineStack(app, "CdkPipelineStack", {
  env: {
    account: process.env.PIPELINE_AWS_ACCOUNT_ID,
    region: process.env.PIPELINE_AWS_REGION,
  },
});

app.synth();