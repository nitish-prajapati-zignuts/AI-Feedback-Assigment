CREATE OR REPLACE FUNCTION create_internal_note(
    p_id text,
    p_feedback_id text,
    p_content text,
    p_created_by text
)
RETURNS SETOF internal_notes AS $$
BEGIN
    RETURN QUERY
    INSERT INTO internal_notes (id, feedback_id, content, created_by, is_deleted, created_at, updated_at)
    VALUES (
        COALESCE(p_id, substring(md5(random()::text) from 1 for 13)),
        p_feedback_id,
        p_content,
        p_created_by,
        false,
        now(),
        now()
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint

CREATE OR REPLACE FUNCTION get_internal_notes(
    p_feedback_id text
)
RETURNS SETOF internal_notes AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM internal_notes
    WHERE feedback_id = p_feedback_id
      AND is_deleted = false
    ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint

CREATE OR REPLACE FUNCTION update_internal_note(
    p_id text,
    p_content text
)
RETURNS SETOF internal_notes AS $$
BEGIN
    RETURN QUERY
    UPDATE internal_notes
    SET content = p_content,
        updated_at = now()
    WHERE id = p_id
      AND is_deleted = false
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint

CREATE OR REPLACE FUNCTION delete_internal_note(
    p_id text
)
RETURNS SETOF internal_notes AS $$
BEGIN
    RETURN QUERY
    UPDATE internal_notes
    SET is_deleted = true,
        updated_at = now()
    WHERE id = p_id
    RETURNING *;
END;
$$ LANGUAGE plpgsql;
