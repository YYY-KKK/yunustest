package dtest.actions.s3;

import com.amazonaws.auth.profile.ProfileCredentialsProvider;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3Client;
import com.amazonaws.services.s3.model.GetObjectRequest;
import com.amazonaws.services.s3.model.S3Object;
import dtest.base.TestAction;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * Read the contents of an object from an AWS S3 bucket into a file on disk.
 */
public class ReadFromS3 extends TestAction {

    @Override
    public void run() {
        super.run();

        String awsCredentialsProfile = this.readStringArgument("awsProfile", "default");
        String bucket = this.readStringArgument("bucket");
        String objectKey = this.readStringArgument("objectKey");
        String targetFile = this.readStringArgument("targetFile");
        Boolean overwrite = this.readBooleanArgument("overwrite", false);
 
        AmazonS3 s3Client = new AmazonS3Client(new ProfileCredentialsProvider(awsCredentialsProfile));
        S3Object object = s3Client.getObject(
                new GetObjectRequest(bucket, objectKey));
        InputStream objectDataStream = object.getObjectContent();

        if (targetFile != null) {

            try {
                if (overwrite) {
                    Files.copy(objectDataStream, Paths.get(targetFile), StandardCopyOption.REPLACE_EXISTING);
                } else {
                    Files.copy(objectDataStream, Paths.get(targetFile));
                }
            } catch (Exception ex) {
                throw new RuntimeException(String.format(
                        "Failed to transfer data from the input stream into file %s",
                        targetFile), ex);
            }
        } else {
            // TODO: Make targetFile arg optional so this branch can execute.
            // Read data in memory and write it to an output value
        }
    }
}
