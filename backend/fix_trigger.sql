CREATE OR REPLACE FUNCTION public.protect_system_roles()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'DELETE' AND OLD.is_system = TRUE THEN
        RAISE EXCEPTION 'No se pueden eliminar roles del sistema';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.is_system = TRUE AND OLD.name != NEW.name THEN
        RAISE EXCEPTION 'No se puede cambiar el nombre de roles del sistema';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$function$;
