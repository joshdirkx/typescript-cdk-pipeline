import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Code, Function, Handler, Runtime } from "aws-cdk-lib/aws-lambda";

var path = require("path");

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new Function(this, "lambda", {
      code: Code.fromAssetImage(path.join(__dirname, "..", "lambda")),
      handler: Handler.FROM_IMAGE,
      runtime: Runtime.FROM_IMAGE,
    });
  };
};