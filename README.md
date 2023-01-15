# Building a CI/CD Pipeline with AWS CDK

[AWS Cloud Development Kit (AWS CDK)](https://aws.amazon.com/cdk/) is a framework used to define cloud infrastructure as code and provision it via [AWS CloudFormation](https://aws.amazon.com/cloudformation/).

## What is in this repository?

In this repository you will find a slim CDK Pipeline that deploys an AWS Lambda function. In addition, there is an SNS Topic that will receive all state change events from the Pipeline and broadcast them to subscribers.

## Requirements

You will need a GitHub account, AWS CDK version 2.60.0 or later, and at least one AWS account.

## Getting Started

Create a GitHub Personal Access Token and store that value as a plain text secret in AWS Secrets Manager using the name `github-token`. This token will need the scopes `repo` and `admin:repo_hook`.
