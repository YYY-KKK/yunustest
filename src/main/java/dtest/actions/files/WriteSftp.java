package dtest.actions.files;

import com.jcraft.jsch.Channel;
import com.jcraft.jsch.ChannelSftp;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;
import dtest.base.TestAction;
import java.io.File;
import java.io.FileInputStream;

public class WriteSftp extends TestAction {

    @Override
    public void run() {
        super.run();

        String filePath = this.readStringArgument("file");
        String targetHost = this.readStringArgument("targetHost");
        Integer targetPort = this.readIntArgument("targetPort", 22);
        String targetDir = this.readStringArgument("targetDir");
        String userName = this.readStringArgument("userName");
        String password = this.readStringArgument("password");

        Session session = null;
        Channel channel = null;
        ChannelSftp channelSftp = null;

        try {
            JSch jsch = new JSch();
            session = jsch.getSession(userName, targetHost, targetPort);
            session.setPassword(password);
            java.util.Properties config = new java.util.Properties();
            config.put("StrictHostKeyChecking", "no");
            session.setConfig(config);
            session.connect();
            this.log.trace("Connected to SFTP host");
            channel = session.openChannel("sftp");
            channel.connect();
            this.log.trace("The SFTP channel was opened and connected");
            channelSftp = (ChannelSftp) channel;
            channelSftp.cd(targetDir);
            File f = new File(filePath);
            channelSftp.put(new FileInputStream(f), f.getName());
        } catch (Exception ex) {
            throw new RuntimeException("SFTP transfer failed", ex);
        } finally {
            if (channelSftp != null) {
                channelSftp.exit();
            }
            if (channel != null) {
                channel.disconnect();
            }
            if (session != null) {
                session.disconnect();
            }
        }
    }
}
