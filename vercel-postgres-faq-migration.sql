CREATE TABLE IF NOT EXISTS faqs (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial FAQs from the hardcoded version
INSERT INTO faqs (question, answer) VALUES
('What are the rules for cooking in the shared kitchen?', 'Please don’t cook beans in the rice cooker. Please use the pressure cooker on the gas stove instead.'),
('Why did the washing machine stop working?', 'The washing machine recently broke down and locked itself because foreign coins were used instead of UAE Dirhams. This causes the machine to shut down for everyone.'),
('What are the rules for using the laundry machines?', '<strong>Zero Tolerance:</strong> Do not attempt to use any currency other than UAE Dirhams.<br /><strong>Camera Surveillance:</strong> We have CCTV cameras installed in the laundry area. While we are not checking the footage for this first incident, we will review the recordings if this happens again.<br /><strong>Identification:</strong> If the machine locks again, we will check the footage and the usage logs to identify the last person at the machine. That individual will be held responsible for the full repair costs.'),
('What are the bank details for rent payment?', 'Please use the following details for bank transfers:<br /><strong>IBAN:</strong> AE88 0260 0002 1471 9079 501<br /><strong>Account Number:</strong> 0214719079501<br /><strong>Swift Code:</strong> EBILAEAD<br /><strong>Routing Number:</strong> 202620103');