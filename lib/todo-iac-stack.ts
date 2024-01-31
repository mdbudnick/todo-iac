import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
<<<<<<< HEAD
import { MachineImage, Instance, InstanceType, Peer, Port, SecurityGroup, SubnetType, UserData, Vpc } from 'aws-cdk-lib/aws-ec2';
=======
import { MachineImage, Instance, InstanceType, KeyPair, Peer, Port, SecurityGroup, SubnetType, UserData, Vpc } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
>>>>>>> db93fb9 (keypair)

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

    const s3BucketName = this.node.tryGetContext('ExpressTodoAppS3BucketName');

    const userData = UserData.forLinux();
    userData.addCommands(
      'dnf update -y',
      'dnf install -y amazon-efs-utils',
      'dnf install -y wget',
      'wget https://s3.amazonaws.com/mountpoint-s3-release/latest/x86_64/mount-s3.rpm -O /tmp/mount-s3.rpm',
      'dnf localinstall -y /tmp/mount-s3.rpm',
      'rm /tmp/mount-s3.rpm',
      `mount-s3 ${s3BucketName} /mnt`,
      'ls /mnt/s3',
      'docker load -i /mnt/todo-express-image-1_0_0.tar.gz',
      'docker run -p 80:3001 -d todo-express:1.0.0',
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
      keyPair
    });
  }
}
