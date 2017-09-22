package dtest.base.http;

public class HttpRequestOptions {

    public boolean ignoreCert;
    
    public String url;

    public HttpVerb httpVerb;

    public String proxy;

    public HttpRequestOptions(String url, HttpVerb httpVerb) {
        this.url = url;
        this.httpVerb = httpVerb;
        this.proxy = null;
        this.ignoreCert = false;
    }
}
