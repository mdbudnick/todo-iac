import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { MachineImage, Instance, InstanceType, KeyPair, Peer, Port, SecurityGroup, SubnetType, UserData, Vpc } from 'aws-cdk-lib/aws-ec2';

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
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443));
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));

    const machineImage = MachineImage.latestAmazonLinux2023()
    const userData = UserData.forLinux();
    userData.addCommands(
      'yum update -y',
      'yum install -y git',
      'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash',
      '. ~/.nvm/nvm.sh',
      'nvm install --lts',
      'setcap \'cap_net_bind_service=+ep\' $(which node)',
      'npm install -g pm2',
      'export APP_PORT=80',
      'git clone https://github.com/mdbudnick/todo-express.git -b prod',
      'cd todo-express',
      'npm ci',
      'pm2 start npm --name "todo-express" -- start',
    );
    const instance = new InstanceType('t2.micro');
    const keyPair = KeyPair.fromKeyPairName(this, 'EC2-KeyPair', 'ec2-todo')
    const ec2Instance = new Instance(this, 'ExpressTodoAppInstance', {
      userData,
      instanceType: instance,
      machineImage,
      vpc,
      securityGroup,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      keyPair
    });
  }
}
