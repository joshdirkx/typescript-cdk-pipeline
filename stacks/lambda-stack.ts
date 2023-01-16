import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Alias, Code, Function, Handler, Runtime } from "aws-cdk-lib/aws-lambda";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { LambdaDeploymentConfig, LambdaDeploymentGroup } from "aws-cdk-lib/aws-codedeploy";
import { Alarm, Metric } from "aws-cdk-lib/aws-cloudwatch";
import { ApplicationEnvironments } from "../stages/application-stage";

var path = require("path");

interface LambdaStackProps extends cdk.StackProps {
  stageName: ApplicationEnvironments,
}

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // create a lambda function from the lambda directory in this repository
    const lambdaFunction = new Function(this, "lambda", {
      code: Code.fromAssetImage(path.join(__dirname, "..", "lambda")),
      handler: Handler.FROM_IMAGE,
      runtime: Runtime.FROM_IMAGE,
    });

    // declare an alias for the latest version of the lambda function
    // this alias is used by CodeDeploy to perform weighted routing upon deployment
    const lambdaAlias = new Alias(this, "lambdaAlias", {
      aliasName: props.stageName,
      version: lambdaFunction.currentVersion,
    });

    // create an API Gateway rest api
    const api = new RestApi(this, "api", {
      deployOptions: {
        stageName: lambdaAlias.aliasName,
      },
    });

    const lambdaApi = api.root.addResource("lambda");

    lambdaApi.addMethod("GET", new LambdaIntegration(lambdaFunction));

    // create a new CloudWatch Alarm for the lambda function
    const lambdaAlarm = new Alarm(this, "lambdaAlarm", {
      alarmDescription: "the most recent lambda deployment has a non-zero error rate",
      metric: new Metric({
        metricName: "lambdaErrors",
        namespace: "aws/lambda",
        // observe the sum total of errors over some interval of time
        statistic: "sum",
        dimensionsMap: {
          Resource: `${lambdaFunction.functionName}:${lambdaAlias.aliasName}:${lambdaFunction.currentVersion}`,
          FunctionName: lambdaFunction.functionName,
        },
        // declare the interval of time as every minute
        period: cdk.Duration.minutes(1),
      }),
      // declare how many errors the lambda needs to experience before raising the alarm
      threshold: 1,
      // the number of periods by which the statistic is compared to the threshold
      // set to zero so it alarms immediately
      evaluationPeriods: 0,
    });

    const deploymentConfig = function () {
      if (lambdaAlias.aliasName == ApplicationEnvironments.staging) {
        // deploy the new version of the lambda immediately to all traffic
        return LambdaDeploymentConfig.ALL_AT_ONCE
      } else {
        // deploy the new version of the lambda to 10% of traffic immediately then an additional 10% every minute
        return LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE
      }
    }

    // create a CodeDeploy Deployment Group
    new LambdaDeploymentGroup(this, "lambdaDeploymentGroup", {
      alias: lambdaAlias,
      deploymentConfig: deploymentConfig(),
      alarms: [
        lambdaAlarm,
      ],
    });
  };
};
