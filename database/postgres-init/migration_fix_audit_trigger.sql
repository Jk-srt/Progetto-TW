-- migration_fix_audit_trigger.sql
-- Date: 2025-09-07
-- Description: Fix the trg_entity_audit trigger to prevent "no field 'role'" error.

-- The original trigger function fails when attached to tables without a 'role' column
-- because it evaluates `OLD.role` even when `TG_TABLE_NAME` is not 'accesso'.
-- This patch modifies the function to use nested IF statements, ensuring that
-- role-specific logic is only executed for the 'accesso' table.

CREATE OR REPLACE FUNCTION trg_entity_audit()
RETURNS TRIGGER AS $$
BEGIN
    -- Use a nested IF to ensure role is only checked for the 'accesso' table
    IF TG_TABLE_NAME = 'accesso' THEN
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            INSERT INTO audit_log (table_name, record_id, field_name, old_value, new_value, changed_by)
            VALUES (TG_TABLE_NAME, OLD.id, 'role', OLD.role, NEW.role, current_user);
        END IF;
    END IF;

    -- You can add other audit logic for other tables here using similar nested checks.
    -- For example:
    -- IF TG_TABLE_NAME = 'flights' THEN
    --     IF OLD.status IS DISTINCT FROM NEW.status THEN
    --         INSERT INTO audit_log (table_name, record_id, field_name, old_value, new_value, changed_by)
    --         VALUES (TG_TABLE_NAME, OLD.id, 'status', OLD.status, NEW.status, current_user);
    --     END IF;
    -- END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trg_entity_audit IS 'Fixed audit trigger that safely checks for column existence by nesting IF conditions based on the table name.';

