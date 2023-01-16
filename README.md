# Building a CI/CD Pipeline with AWS CDK

[AWS Cloud Development Kit (AWS CDK)](https://aws.amazon.com/cdk/) is a framework used to define cloud infrastructure as code and provision it via [AWS CloudFormation](https://aws.amazon.com/cloudformation/).

## What is in this repository?

- Self-mutating CDK CodePipeline emitting state change events to an SNS Topic
- Application consiting of an API Gateway rest api with one route backed by a Lambda Function
- Deployment to two environments
- Configurable deployment strategy for the Lambda Function, supporting linear/canary/all at once
- CloudWatch Alarm that will alert when the sum total of errors is greater than zero over the internal of one minute
- Permission check for changes to IAM permissions or Security Group rules
- Manual approval for production deployment


## Requirements

You will need a GitHub account, AWS CDK version 2.60.0 or later, and at least one AWS account (two is recommended; one for the pipeline, one for the provisioned resources).

## Deploying this Pipeline

Fork this repository into your organization.

### Preparing the Pipeline Account

Create a GitHub Personal Access Token with the scopes the scopes `repo` and `admin:repo_hook` and store that value as a plain text secret in [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/) using the name `github-token`. This secret should live in the same AWS account that the pipeline is being deployed into.


### Bootstrapping the AWS Account(s)

Once the token is in place, the account(s) being used need to be bootstrapped.

If you are using one account, the following command will get you going. Replace `AWS_ACCOUNT_ID` and `AWS_REGION` with your account identifier and desired region, respectively.

```bash
npx cdk bootstrap \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
  aws://AWS_ACCOUNT_ID/AWS_REGION
```

If you are using two accounts, we will need to bootstrap both the pipeline account and the account in which resources will be provisioned.

First, bootstrap the pipeline account. Replace `PIPELINE_AWS_ACCOUNT_ID` and `AWS_REGION` with the account identifier for the pipeline and desired region for the pipeline, respectively.

```bash
npx cdk bootstrap \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
  aws://PIPELINE_AWS_ACCOUNT_ID/AWS_REGION
```

Next, bootstrap the account that will host the resources the pipeline outputs. Replace `PIPELINE_AWS_ACCOUNT_ID`, `RESOURCES_AWS_ACCOUNT_ID` and `AWS_REGION` with the account identifier for the pipeline account, the account identifier for the resources account, and desired region for the created resources, respectively.


```bash
npx cdk bootstrap \
  --trust PIPELINE_AWS_ACCOUNT_ID
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
  aws://RESOURCES_AWS_ACCOUNT_ID/AWS_REGION
```

### Preparing the Code

Modify `bin/cdk-pipeline.ts` with your AWS account identifier and desired region.

Commit and push your changes to GitHub.

### First Deployment

The first deployment of the pipeline is manual from your command line, every successive change will happen upon commit to the repository.

To deploy your pipeline, run the following command

```bash
cdk deploy -c username=jdirkx \
  -c gitHubOrganization=joshdirkx \
  -c gitHubRepository=typescript-cdk-pipeline \
  -c gitHubBranch=main \
  -c awsAccountId=245824979453 \
  -c awsRegion=us-west-2
```

### Expansion Ideas
- Add Slack as subscriber of the SNS Topic
- Allow manual approval steps to be confirmed via Slack