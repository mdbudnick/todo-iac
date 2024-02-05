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

    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443));
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));
    const machineImage = MachineImage.latestAmazonLinux2023()
    const userData = UserData.forLinux();
    userData.addCommands(
      'chown -R ec2-user: /home/ec2-user',
      'export HOME=/home/ec2-user',
      'cd /home/ec2-user',
      'yum update -y',
      'sudo -u ec2-user bash -c "whoami;PATH=$PATH:/usr/local/bin"',
      'yum install -y git',
      'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash',
      '. ~/.nvm/nvm.sh',
      'nvm install --lts',
      'npm install pm2@latest -g',
      'sudo chown -R ec2-user:ec2-user "/home/ec2-user/.npm"',
      'git clone https://github.com/mdbudnick/todo-express.git -b prod',
      'sudo chown -R ec2-user: /home/ec2-user/todo-express',
      'cd todo-express',
      'openssl genrsa -out privatekey.pem',
      'openssl req -new -x509 -key privatekey.pem -out server.crt -days 365 -subj "/C=US/ST=NY/L=NYC/O=Waves Workshop/CN=ec2-todo/emailAddress=michaeldbudnick@gmail.com"',
      'NODE_ENV=production npm ci --include=dev > /tmp/npm.log 2>&1',
      'export APP_PORT=443',
      'sudo setcap "cap_net_bind_service=+ep" $(which node)',
      'pm2 start npm --name "todo-express" -- start > /tmp/pm2.log 2>&1',
      'sudo chown ec2-user:ec2-user /home/ec2-user/.pm2/rpc.sock /home/ec2-user/.pm2/pub.sock',
      'touch /tmp/complete.log'
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
    
    new cdk.CfnOutput(this, 'InstancePublicIp', {
      value: ec2Instance.instancePublicIp,
      description: 'Public IPv4 address of the EC2 instance',
    });

    new cdk.CfnOutput(this, 'InstancePublicTasksEndpoint', {
      value: "https://" + ec2Instance.instancePublicDnsName + "/v1/tasks",
      description: 'API endpoint of the EC2 instance',
    });
  }
}
