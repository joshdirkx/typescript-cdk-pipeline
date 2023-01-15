import * as cdk from "aws-cdk-lib";
import {
  CodePipeline,
  CodePipelineSource,
  ConfirmPermissionsBroadening,
  ManualApprovalStep,
  ShellStep,
} from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { ApplicationStage } from "../stages/application-stage";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";

export class CdkPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // pull values out of the context command so they can be set to environment variables during the synth step
    const username = this.node.tryGetContext("username");
    const gitHubOrganization = this.node.tryGetContext("gitHubOrganization");
    const gitHubRepository = this.node.tryGetContext("gitHubRepository");
    const gitHubBranch = this.node.tryGetContext("gitHubBranch");
    const awsAccountId = this.node.tryGetContext("awsAccountId");
    const awsRegion = this.node.tryGetContext("awsRegion");

    // build a prefix to be used for naming resources
    const prefix = `${username}-${gitHubOrganization}-${gitHubRepository}-${gitHubBranch}`

    const pipeline = new CodePipeline(this, "pipeline", {
      // enables the pipeline to exist in one account and deploy resources into other accounts
      crossAccountKeys: true,
      pipelineName: `${prefix}-pipeline`,
      synth: new ShellStep("synth", {
        input: CodePipelineSource.gitHub(`${gitHubOrganization}/${gitHubRepository}`, gitHubBranch),
        env: {
          GIT_HUB_ORGANIZATION: gitHubOrganization,
          GIT_HUB_REPOSITORY: gitHubRepository,
          GIT_HUB_BRANCH: gitHubBranch,
          USERNAME: username,
          AWS_ACCOUNT_ID: awsAccountId,
          AWS_REGION: awsRegion,
        },
        commands: [
          "npm ci",
          "npm run build",
          "npx cdk synth -c username=$USERNAME \
            -c gitHubOrganization=$GIT_HUB_ORGANIZATION \
            -c gitHubRepository=$GIT_HUB_REPOSITORY \
            -c gitHubBranch=$GIT_HUB_BRANCH \
            -c awsAccountId=$AWS_ACCOUNT_ID \
            -c awsRegion=$AWS_REGION",
        ],
      }),
    });

    // build a new SNS topic that will transmit state change events for the pipeline
    const topic = new Topic(this, `${prefix}-pipelineTopic`);

    // add an email subscriber
    topic.addSubscription(new EmailSubscription(`email+${prefix}@domain.com`));

    const staging = new ApplicationStage(this, `${prefix}-lambdaStaging`, {
      env: {
        account: awsAccountId,
        region: awsRegion,
      },
    });

    const production = new ApplicationStage(this, `${prefix}-lambdaProduction`, {
      env: {
        account: awsAccountId,
        region: awsRegion,
      },
    });

    // add a stage to the pipeline for a production environment
    pipeline.addStage(staging, {
      pre: [
        // check for changes to IAM perimssions or Security Group rules
        // auto-approves if no changes, manual approval required for changes
        new ConfirmPermissionsBroadening("securityCheck", {
          stage: staging,
        }),
      ],
    });

    // add a stage to the pipeline for a production environment
    pipeline.addStage(production, {
      pre: [
        // adds a manual approval step before this stage can be deployed
        new ManualApprovalStep("deployProduction"),
      ],
    });

    // force the pipeline to build so notifications can be added to it
    pipeline.buildPipeline();

    // notify whenever anything happens during the pipeline
    pipeline.pipeline.notifyOnAnyActionStateChange(`${prefix}-pipelineStateChange`, topic)
    pipeline.pipeline.notifyOnAnyManualApprovalStateChange(`${prefix}-pipelineManualApprovalStateChange`, topic)
    pipeline.pipeline.notifyOnAnyStageStateChange(`${prefix}-pipelineStageStateChange`, topic)
    pipeline.pipeline.notifyOnExecutionStateChange(`${prefix}-pipelineExecutionStateChange`, topic)
  };
};
