package dtest.base.http;

import java.net.URI;
import org.apache.http.client.methods.HttpPost;

public class HttpDeleteWithBody extends HttpPost {

    HttpDeleteWithBody(String uri) {
        super(uri);
    }
    
    HttpDeleteWithBody(URI uri) {
        super(uri);
    }
    
    @Override
    public String getMethod() {
        return "DELETE";
    }
}
