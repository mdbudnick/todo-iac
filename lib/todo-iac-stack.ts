import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { AmazonLinuxImage, Instance, InstanceType, Peer, Port, SecurityGroup, UserData, Vpc } from 'aws-cdk-lib/aws-ec2';
export class TodoIacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'ExpressTodoAppVpc', {
      maxAzs: 2,
    });

    const securityGroup = new SecurityGroup(this, 'ExpressTodoAppSecurityGroup', {
      vpc,
    });

    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));

    const s3BucketName = this.node.tryGetContext('ExpressTodoAppS3BucketName');

    const userData = UserData.forLinux();
    userData.addCommands(
      'yum update -y',
      'yum install -y amazon-efs-utils',
      'yum install -y wget',
      'wget https://s3.amazonaws.com/mountpoint-s3-release/latest/x86_64/mount-s3.rpm -O /tmp/mount-s3.rpm',
      'yum localinstall -y /tmp/mount-s3.rpm',
      'rm /tmp/mount-s3.rpm',
      `mount-s3 ${s3BucketName} /mnt`,
      'ls /mnt/s3',
      'docker load -i /mnt/todo-express-image-1_0_0.tar.gz',
      'docker run -p 80:3001 -d todo-express:1.0.0',
    );

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
