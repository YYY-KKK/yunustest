package dtest.contracts;

public interface ISharedData {
	public String get(String propertyName);
	
	public void set(String propertyName, String propertyValue);
}
