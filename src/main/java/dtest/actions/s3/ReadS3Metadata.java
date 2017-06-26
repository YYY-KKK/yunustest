package dtest.actions.s3;

import com.amazonaws.auth.profile.ProfileCredentialsProvider;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3Client;
import com.amazonaws.services.s3.model.GetObjectMetadataRequest;
import com.amazonaws.services.s3.model.ObjectMetadata;
import dtest.base.TestAction;
import java.util.Date;

/**
 * Read the contents of an object from an AWS S3 bucket into a file on disk.
 */
public class ReadS3Metadata extends TestAction {

    @Override
    public void run() {
        super.run();

        String awsCredentialsProfile = this.readStringArgument("awsProfile", "default");
        String bucket = this.readStringArgument("bucket");
        String objectKey = this.readStringArgument("objectKey");

        AmazonS3 s3Client = new AmazonS3Client(new ProfileCredentialsProvider(awsCredentialsProfile));
        ObjectMetadata metadata = s3Client.getObjectMetadata(
                new GetObjectMetadataRequest(bucket, objectKey));

        try {
            Date expirationTime = metadata.getExpirationTime();
            if (expirationTime != null) {
                this.writeOutput("expirationTime", metadata.getExpirationTime().getTime());
            } else {
                this.writeOutput("expirationTime", null);
            }
            this.writeOutput("lastModified", metadata.getLastModified().getTime());
            this.writeOutput("userMetadata", metadata.getUserMetadata());
            this.writeOutput("size", metadata.getContentLength());
            this.writeOutput("storageClass", metadata.getStorageClass());
            this.writeOutput("versionId", metadata.getVersionId());
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to get object metadata for object key %s in bucket %s",
                    objectKey,
                    bucket), ex);
        }
    }
}
