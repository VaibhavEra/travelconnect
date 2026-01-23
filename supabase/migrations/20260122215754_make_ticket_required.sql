-- Make ticket_file_url required
-- First ensure no null values exist
UPDATE trips 
SET ticket_file_url = 'https://placeholder.com/ticket.jpg' 
WHERE ticket_file_url IS NULL;

-- Make column NOT NULL
ALTER TABLE trips ALTER COLUMN ticket_file_url SET NOT NULL;
