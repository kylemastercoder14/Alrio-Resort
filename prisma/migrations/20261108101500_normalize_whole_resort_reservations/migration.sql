-- Existing reservations now represent exclusive use of the entire resort.
-- Room and package records remain available as informational inclusions.
UPDATE "resort_reservation"
SET
  "roomId" = NULL,
  "packageName" = NULL,
  "packagePrice" = NULL;
