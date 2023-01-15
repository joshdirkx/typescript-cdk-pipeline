import * as cdk from "aws-cdk-lib";
import {
  CodePipeline,
  CodePipelineSource,
  ConfirmPermissionsBroadening,
  ManualApprovalStep,
  ShellStep,
} from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { LambdaStage } from "../stages/lambda-stage";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";

export class CdkPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, "pipeline", {
      // enables the pipeline to exist in one account and deploy resources into other accounts
      crossAccountKeys: true,
      pipelineName: "pipeline",
      synth: new ShellStep("Synth", {
        input: CodePipelineSource.gitHub("joshdirkx/typescript-cdk-pipeline", "main"),
        commands: [
          "npm ci",
          "npm run build",
          "npx cdk synth",
        ],
      }),
    });

    // build a new SNS topic that will transmit state change events for the pipeline
    const topic = new Topic(this, "pipelineTopic");

    // add an email subscriber
    topic.addSubscription(new EmailSubscription("email@domain.com"));

    const production = new LambdaStage(this, "production", {
      env: {
        account: "245824979453",
        region: "us-west-2",
      },
    });

    // add a stage to the pipeline for a production environment, which creates a simple Lambda function
    pipeline.addStage(production, {
      pre: [
        // check for changes to IAM perimssions or Security Group rules
        // auto-approves if no changes, manual approval required for changes
        new ConfirmPermissionsBroadening("securityCheck", {
          stage: production,
        }),
        // adds a manual approval step before this stage can be deployed
        new ManualApprovalStep("deploy"),
      ],
    });

    // force the pipeline to build so notifications can be added to it
    pipeline.buildPipeline();

    // notify whenever anything happens during the pipeline
    pipeline.pipeline.notifyOnAnyActionStateChange("pipelineStateChange", topic)
    pipeline.pipeline.notifyOnAnyManualApprovalStateChange("pipelineManualApprovalStateChange", topic)
    pipeline.pipeline.notifyOnAnyStageStateChange("pipelineStageStateChange", topic)
    pipeline.pipeline.notifyOnExecutionStateChange("pipelineExecutionStateChange", topic)
  };
};
