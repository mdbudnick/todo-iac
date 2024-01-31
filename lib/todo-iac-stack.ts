import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { MachineImage, Instance, InstanceType, KeyPair, Peer, Port, SecurityGroup, SubnetType, UserData, Vpc } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';

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
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));

    const s3BucketName = process.env.TODO_BUCKET || this.node.tryGetContext('ExpressTodoAppS3BucketName');
    const s3Bucket = Bucket.fromBucketArn(this, 'ExistingS3Bucket', `arn:aws:s3:::${s3BucketName}`);

    const role = new Role(this, 'S3AccessRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'), // Assuming this role by EC2 instances
    });
    role.addToPolicy(new PolicyStatement({
      actions: ['s3:ListBucket'],
      resources: [s3Bucket.bucketArn],
    }));
    role.addToPolicy(new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`${s3Bucket.bucketArn}/*`],
    }));

    const userData = UserData.forLinux();
    userData.addCommands(
      'mkdir /tmp/startup',
      'yum update -y > /tmp/startup/yum-update.log',
      'yum install -y amazon-efs-utils > /tmp/startup/install-amazon-efs-utils.log',
      'yum install -y amazon-cloudwatch-agent > /tmp/startup/install-amazon-cloudwatch-agent.log',
      'yum install -y wget > /tmp/startup/install-wget.log',
      'wget https://s3.amazonaws.com/mountpoint-s3-release/latest/x86_64/mount-s3.rpm -O /tmp/mount-s3.rpm',
      'yum localinstall -y /tmp/mount-s3.rpm > /tmp/startup/install-mount-s3.log',
      'rm /tmp/mount-s3.rpm',
      `mount-s3 ${s3BucketName} /mnt > /tmp/startup/mount-s3.log`,
      'docker load -i /mnt/todo-express-image-1_0_0.tar.gz  > /tmp/startup/docker-load.log',
      'docker run -p 80:3001 -d todo-express:1.0.0 > /tmp/startup/docker-run.log',
    );

    const instance = new InstanceType('t2.micro');
    const machineImage = MachineImage.latestAmazonLinux2()
    const keyPair = KeyPair.fromKeyPairName(this, 'EC2-KeyPair', 'ec2-todo')

    const ec2Instance = new Instance(this, 'ExpressTodoAppInstance', {
      instanceType: instance,
      machineImage,
      vpc,
      securityGroup,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      role,
      keyPair
    });
  }
}
