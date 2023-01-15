import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Alias, Code, Function, Handler, Runtime } from "aws-cdk-lib/aws-lambda";
import { LambdaIntegration, LambdaRestApi, RestApi } from "aws-cdk-lib/aws-apigateway";
import { LambdaDeploymentConfig, LambdaDeploymentGroup } from "aws-cdk-lib/aws-codedeploy";

var path = require("path");

interface LambdaStackProps extends cdk.StackProps {
  stageName: string,
}

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const stageName = props.stageName;

    // create a simple hello world lambda function
    const lambdaFunction = new Function(this, "lambda", {
      code: Code.fromAssetImage(path.join(__dirname, "..", "lambda")),
      handler: Handler.FROM_IMAGE,
      runtime: Runtime.FROM_IMAGE,
    });

    // declare an alias for the latest version of the lambda
    // this alias is used by CodeDeploy to perform weighted routed of the lambda upon deployment
    const lambdaAlias = new Alias(this, "lambdaAlias", {
      aliasName: stageName,
      version: lambdaFunction.currentVersion,
    });

    // create a simple rest api from API Gateway
    const api = new RestApi(this, "api", {
      deployOptions: {
        stageName: stageName,
      },
    });

    const lambdaApi = api.root.addResource("lambda");

    lambdaApi.addMethod("GET", new LambdaIntegration(lambdaFunction));

    // create a CodeDeploy Deployment Group that with a configurable deployment strategy
    // the selected strategy will deploy the new version of the lambda to 10% of traffic immediately,
    // then an additional 10% every minute
    new LambdaDeploymentGroup(this, "lambdaDeploymentGroup", {
      alias: lambdaAlias,
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
    });
  };
};