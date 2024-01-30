import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AmazonLinuxImage, Instance, InstanceType, Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';

export class TodoIacStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC
    const vpc = new Vpc(this, 'ExpressTodoAppVpc', {
      maxAzs: 2, // Set the number of Availability Zones as needed
    });

    // Create a security group
    const securityGroup = new SecurityGroup(this, 'ExpressTodoAppSecurityGroup', {
      vpc,
    });

    // Allow inbound traffic on port 80 (or your desired port)
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));

    // Launch EC2 instance
    const instance = new InstanceType('t2.micro');
    const machineImage = new AmazonLinuxImage();

    const ec2Instance = new Instance(this, 'ExpressTodoAppInstance', {
      instanceType: instance,
      machineImage,
      vpc,
      securityGroup,
    });
  }
}
