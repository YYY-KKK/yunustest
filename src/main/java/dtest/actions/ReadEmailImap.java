package dtest.actions;

import dtest.base.TestAction;
import dtest.base.logging.Logger;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import javax.mail.BodyPart;
import javax.mail.Folder;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.Store;
import javax.mail.internet.MimeMultipart;
import javax.mail.search.AndTerm;
import javax.mail.search.ComparisonTerm;
import javax.mail.search.FromStringTerm;
import javax.mail.search.SearchTerm;
import javax.mail.search.SentDateTerm;
import javax.mail.search.SubjectTerm;

/**
 * An action that reads the content of an email message using the IMAP protocol.
 * The action produces the output values "body", "subject", and "from".
 */
public class ReadEmailImap extends TestAction {

    private static final String DATE_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

    @Override
    public void run() {
        super.run();

        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern(DATE_TIME_FORMAT);

        String imapServer = readStringArgument("server");
        String emailSubject = readStringArgument("subject");
        String fromAddress = readStringArgument("from", "");
        String sentAfter = readStringArgument(
                "sentAfter",
                LocalDateTime.now().minusDays(365).format(dateTimeFormatter));
        String userName = readStringArgument("userName");
        String password = readStringArgument("password");

        LocalDateTime sentAfterDate = LocalDateTime.parse(
                sentAfter,
                dateTimeFormatter);
        ZonedDateTime sentAfterZonedDate = ZonedDateTime.of(
                sentAfterDate,
                ZoneId.systemDefault());

        Folder inbox = null;
        Store store = null;

        try {
            Session session = Session.getDefaultInstance(System.getProperties());
            store = session.getStore("imaps");
            store.connect(imapServer, userName, password);
            inbox = store.getFolder("Inbox");
            inbox.open(Folder.READ_ONLY);

            SentDateTerm sentDateTerm = new SentDateTerm(
                    ComparisonTerm.GE,
                    Date.from(sentAfterZonedDate.toInstant()));
            SubjectTerm subjectTerm = new SubjectTerm(emailSubject);
            SearchTerm searchTerm = new AndTerm(subjectTerm, sentDateTerm);
            if (fromAddress != null) {
                FromStringTerm fromTerm = new FromStringTerm(fromAddress);
                searchTerm = new AndTerm(searchTerm, fromTerm);
            }
            List<Message> messages = Arrays.asList(inbox.search(searchTerm));
            List<Message> filteredMessages = new ArrayList<>();

            for (Message message : messages) {
                // Make sure the sent date and time is after the specified
                // one. Since javax.mail only takes the date into consideration,
                // ignoring the time, we might end up with messages sent earlier
                // than the date specified
                if (message.getSentDate().after(Date.from(sentAfterZonedDate.toInstant()))) {
                    filteredMessages.add(message);
                }
            }

            if (filteredMessages.isEmpty()) {
                throw new RuntimeException(
                        "No email messages found matching the given criteria");
            } else {
                // In case multiple messages match the search criteria, use the
                // very last one (which is normally the most recent)
                Message message = filteredMessages.get(filteredMessages.size() - 1);
                this.writeOutput("body", this.getTextFromMessage(message));
                this.writeOutput("from", message.getFrom());
                this.writeOutput("subject", message.getSubject());
            }
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to read email from server %s", imapServer), ex);
        } finally {
            try {
                if (inbox != null) {
                    inbox.close(true);
                }
                if (store != null) {
                    store.close();
                }
            } catch (MessagingException ex) {
                Logger.error("Failed to close the email store and/or folder", ex);
            }
        }
    }

    /**
     * Extracts the text content of an email message with support for multipart
     * messages
     */
    private String getTextFromMessage(Message message) throws Exception {
        String result = "";
        if (message.isMimeType("text/plain")) {
            result = message.getContent().toString();
        } else if (message.isMimeType("multipart/*")) {
            MimeMultipart mimeMultipart = (MimeMultipart) message.getContent();
            result = getTextFromMimeMultipart(mimeMultipart);
        }
        return result;
    }

    /**
     * Extracts the text content of a multipart email message
     */
    private String getTextFromMimeMultipart(MimeMultipart mimeMultipart) throws Exception {
        String result = "";
        int partCount = mimeMultipart.getCount();
        for (int i = 0; i < partCount; i++) {
            BodyPart bodyPart = mimeMultipart.getBodyPart(i);
            if (bodyPart.isMimeType("text/plain")) {
                result = result + "\n" + bodyPart.getContent();
                break; // without break same text appears twice in my tests
            } else if (bodyPart.isMimeType("text/html")) {
                String html = (String) bodyPart.getContent();
                // result = result + "\n" + org.jsoup.Jsoup.parse(html).text();
                result = html;
            } else if (bodyPart.getContent() instanceof MimeMultipart) {
                result = result + getTextFromMimeMultipart((MimeMultipart) bodyPart.getContent());
            }
        }
        return result;
    }
}
