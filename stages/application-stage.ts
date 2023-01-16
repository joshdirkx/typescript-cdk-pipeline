import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaStack } from "../stacks/lambda-stack";

export enum ApplicationEnvironments {
  staging = "staging",
  production = "production",
}

interface ApplicationStageProps extends cdk.StageProps {
  stageName: ApplicationEnvironments,
}
export class ApplicationStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: ApplicationStageProps) {
    super(scope, id, props);

    new LambdaStack(this, "lambdaStack", props);
  };
};