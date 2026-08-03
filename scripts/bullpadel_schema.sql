--
-- PostgreSQL database dump
--

\restrict 9JvpwAfDnpK3RZ5bqvFm53GbDYWHq6mloUAVAIeWDPzmcfF9KoOEKZzfjPFJHNm

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pl5cuer38abn5y1; Type: SCHEMA; Schema: -; Owner: bullpadel_user
--

CREATE SCHEMA pl5cuer38abn5y1;


ALTER SCHEMA pl5cuer38abn5y1 OWNER TO bullpadel_user;

--
-- Name: ppilqjxod48g6rq; Type: SCHEMA; Schema: -; Owner: bullpadel_user
--

CREATE SCHEMA ppilqjxod48g6rq;


ALTER SCHEMA ppilqjxod48g6rq OWNER TO bullpadel_user;

--
-- Name: calcular_lead_score(); Type: FUNCTION; Schema: public; Owner: bullpadel_user
--

CREATE FUNCTION public.calcular_lead_score() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.lead_score_manual IS TRUE THEN
    RETURN NEW;
  END IF;
  IF NEW.estado_lead = 'cliente_activo' THEN
    NEW.lead_score := 'cliente';
  ELSIF NEW.estado_lead = 'interesado_compra' AND NEW.fecha_ultima_interaccion > NOW() - INTERVAL '2 hours' THEN
    NEW.lead_score := 'caliente';
  ELSIF NEW.estado_lead IN ('interesado', 'interesado_compra') AND NEW.fecha_ultima_interaccion > NOW() - INTERVAL '24 hours' THEN
    NEW.lead_score := 'tibio';
  ELSE
    NEW.lead_score := 'frio';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.calcular_lead_score() OWNER TO bullpadel_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.activity_log (
    id integer NOT NULL,
    usuario_id integer,
    contacto_id integer,
    accion character varying(100) NOT NULL,
    valor_anterior text,
    valor_nuevo text,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activity_log OWNER TO bullpadel_user;

--
-- Name: activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.activity_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.activity_log_id_seq OWNER TO bullpadel_user;

--
-- Name: activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.activity_log_id_seq OWNED BY public.activity_log.id;


--
-- Name: campanas_email; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.campanas_email (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    asunto character varying(255) NOT NULL,
    contenido_html text NOT NULL,
    segmento_id integer,
    destinatarios_count integer DEFAULT 0,
    enviados_count integer DEFAULT 0,
    fallidos_count integer DEFAULT 0,
    estado character varying(20) DEFAULT 'borrador'::character varying,
    creado_por integer,
    fecha_creacion timestamp with time zone DEFAULT now(),
    fecha_envio timestamp with time zone,
    destinatarios_manual_ids integer[]
);


ALTER TABLE public.campanas_email OWNER TO bullpadel_user;

--
-- Name: campanas_email_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.campanas_email_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.campanas_email_id_seq OWNER TO bullpadel_user;

--
-- Name: campanas_email_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.campanas_email_id_seq OWNED BY public.campanas_email.id;


--
-- Name: compras_crm; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.compras_crm (
    id integer NOT NULL,
    contacto_id integer,
    producto text NOT NULL,
    precio numeric(10,2),
    canal character varying(50),
    notas text,
    vendedor_id integer,
    fecha_compra timestamp with time zone DEFAULT now(),
    numero_factura character varying(50),
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    medio_pago character varying(30)
);


ALTER TABLE public.compras_crm OWNER TO bullpadel_user;

--
-- Name: compras_crm_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.compras_crm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.compras_crm_id_seq OWNER TO bullpadel_user;

--
-- Name: compras_crm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.compras_crm_id_seq OWNED BY public.compras_crm.id;


--
-- Name: configuracion_integraciones; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.configuracion_integraciones (
    id integer NOT NULL,
    clave character varying(100) NOT NULL,
    valor text,
    actualizado_por integer,
    fecha_actualizacion timestamp with time zone DEFAULT now()
);


ALTER TABLE public.configuracion_integraciones OWNER TO bullpadel_user;

--
-- Name: configuracion_integraciones_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.configuracion_integraciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.configuracion_integraciones_id_seq OWNER TO bullpadel_user;

--
-- Name: configuracion_integraciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.configuracion_integraciones_id_seq OWNED BY public.configuracion_integraciones.id;


--
-- Name: contacto_etiquetas; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.contacto_etiquetas (
    contacto_id integer NOT NULL,
    etiqueta_id integer NOT NULL
);


ALTER TABLE public.contacto_etiquetas OWNER TO bullpadel_user;

--
-- Name: contactos; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.contactos (
    id integer NOT NULL,
    canal_user_id character varying(255) NOT NULL,
    canal character varying(50) NOT NULL,
    nombre character varying(255),
    telefono character varying(30),
    email character varying(255),
    estado_lead character varying(50) DEFAULT 'inicial'::character varying NOT NULL,
    fecha_primer_contacto timestamp with time zone DEFAULT now() NOT NULL,
    fecha_ultima_interaccion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_cambio_estado timestamp with time zone,
    notas_internas text,
    vendedor_asignado_id integer,
    lead_score character varying(20) DEFAULT 'frio'::character varying,
    agente_pausado boolean DEFAULT false,
    pausa_hasta timestamp with time zone,
    whatsapp_number character varying(50),
    instagram_id character varying(100),
    facebook_id character varying(100),
    lead_score_manual boolean DEFAULT false,
    lead_score_override boolean DEFAULT false,
    telefono_solicitado boolean DEFAULT false,
    origen character varying(20) DEFAULT 'automatico'::character varying
);


ALTER TABLE public.contactos OWNER TO bullpadel_user;

--
-- Name: contactos_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.contactos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.contactos_id_seq OWNER TO bullpadel_user;

--
-- Name: contactos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.contactos_id_seq OWNED BY public.contactos.id;


--
-- Name: etiquetas; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.etiquetas (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    color character varying(7) DEFAULT '#1B2B8C'::character varying,
    creado_por integer,
    fecha_creacion timestamp with time zone DEFAULT now()
);


ALTER TABLE public.etiquetas OWNER TO bullpadel_user;

--
-- Name: etiquetas_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.etiquetas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.etiquetas_id_seq OWNER TO bullpadel_user;

--
-- Name: etiquetas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.etiquetas_id_seq OWNED BY public.etiquetas.id;


--
-- Name: historial_conversaciones; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.historial_conversaciones (
    id bigint NOT NULL,
    id_contacto integer NOT NULL,
    canal character varying(50) NOT NULL,
    rol character varying(20) NOT NULL,
    contenido text NOT NULL,
    tokens_usados integer,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    imagen_url text,
    CONSTRAINT historial_conversaciones_rol_check CHECK (((rol)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying, 'system'::character varying, 'vendedor'::character varying])::text[])))
);


ALTER TABLE public.historial_conversaciones OWNER TO bullpadel_user;

--
-- Name: historial_conversaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.historial_conversaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.historial_conversaciones_id_seq OWNER TO bullpadel_user;

--
-- Name: historial_conversaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.historial_conversaciones_id_seq OWNED BY public.historial_conversaciones.id;


--
-- Name: leads_vinculados; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.leads_vinculados (
    id integer NOT NULL,
    contacto_principal_id integer,
    contacto_vinculado_id integer,
    vinculado_por integer,
    fecha_vinculacion timestamp with time zone DEFAULT now()
);


ALTER TABLE public.leads_vinculados OWNER TO bullpadel_user;

--
-- Name: leads_vinculados_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.leads_vinculados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.leads_vinculados_id_seq OWNER TO bullpadel_user;

--
-- Name: leads_vinculados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.leads_vinculados_id_seq OWNED BY public.leads_vinculados.id;


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.login_attempts (
    id integer NOT NULL,
    ip character varying(45) NOT NULL,
    intentos integer DEFAULT 1,
    primer_intento timestamp with time zone DEFAULT now(),
    bloqueado_hasta timestamp with time zone,
    ultimo_intento timestamp with time zone DEFAULT now()
);


ALTER TABLE public.login_attempts OWNER TO bullpadel_user;

--
-- Name: login_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.login_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.login_attempts_id_seq OWNER TO bullpadel_user;

--
-- Name: login_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.login_attempts_id_seq OWNED BY public.login_attempts.id;


--
-- Name: nc_api_tokens; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_api_tokens (
    id integer NOT NULL,
    base_id character varying(20),
    db_alias character varying(255),
    description character varying(255),
    permissions text,
    token text,
    expiry character varying(255),
    enabled boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    fk_user_id character varying(20)
);


ALTER TABLE public.nc_api_tokens OWNER TO bullpadel_user;

--
-- Name: nc_api_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.nc_api_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.nc_api_tokens_id_seq OWNER TO bullpadel_user;

--
-- Name: nc_api_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.nc_api_tokens_id_seq OWNED BY public.nc_api_tokens.id;


--
-- Name: nc_audit_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_audit_v2 (
    id character varying(20) NOT NULL,
    "user" character varying(255),
    ip character varying(255),
    source_id character varying(20),
    base_id character varying(20),
    fk_model_id character varying(20),
    row_id character varying(255),
    op_type character varying(255),
    op_sub_type character varying(255),
    status character varying(255),
    description text,
    details text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_audit_v2 OWNER TO bullpadel_user;

--
-- Name: nc_base_users_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_base_users_v2 (
    base_id character varying(20) NOT NULL,
    fk_user_id character varying(20) NOT NULL,
    roles text,
    starred boolean,
    pinned boolean,
    "group" character varying(255),
    color character varying(255),
    "order" real,
    hidden real,
    opened_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    invited_by character varying(20)
);


ALTER TABLE public.nc_base_users_v2 OWNER TO bullpadel_user;

--
-- Name: nc_bases_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_bases_v2 (
    id character varying(128) NOT NULL,
    title character varying(255),
    prefix character varying(255),
    status character varying(255),
    description text,
    meta text,
    color character varying(255),
    uuid character varying(255),
    password character varying(255),
    roles character varying(255),
    deleted boolean DEFAULT false,
    is_meta boolean,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_bases_v2 OWNER TO bullpadel_user;

--
-- Name: nc_calendar_view_columns_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_calendar_view_columns_v2 (
    id character varying(20) NOT NULL,
    base_id character varying(20),
    source_id character varying(20),
    fk_view_id character varying(20),
    fk_column_id character varying(20),
    show boolean,
    bold boolean,
    underline boolean,
    italic boolean,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_calendar_view_columns_v2 OWNER TO bullpadel_user;

--
-- Name: nc_calendar_view_range_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_calendar_view_range_v2 (
    id character varying(20) NOT NULL,
    fk_view_id character varying(20),
    fk_to_column_id character varying(20),
    label character varying(40),
    fk_from_column_id character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    base_id character varying(20)
);


ALTER TABLE public.nc_calendar_view_range_v2 OWNER TO bullpadel_user;

--
-- Name: nc_calendar_view_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_calendar_view_v2 (
    fk_view_id character varying(20) NOT NULL,
    base_id character varying(20),
    source_id character varying(20),
    title character varying(255),
    fk_cover_image_col_id character varying(20),
    meta text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.nc_calendar_view_v2 OWNER TO bullpadel_user;

--
-- Name: nc_col_barcode_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_col_barcode_v2 (
    id character varying(20) NOT NULL,
    fk_column_id character varying(20),
    fk_barcode_value_column_id character varying(20),
    barcode_format character varying(15),
    deleted boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    base_id character varying(20)
);


ALTER TABLE public.nc_col_barcode_v2 OWNER TO bullpadel_user;

--
-- Name: nc_col_button_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_col_button_v2 (
    id character varying(20),
    base_id character varying(20),
    type character varying(255),
    label text,
    theme character varying(255),
    color character varying(255),
    icon character varying(255),
    formula text,
    formula_raw text,
    error character varying(255),
    parsed_tree text,
    fk_webhook_id character varying(20),
    fk_column_id character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_col_button_v2 OWNER TO bullpadel_user;

--
-- Name: nc_col_formula_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_col_formula_v2 (
    id character varying(20) NOT NULL,
    fk_column_id character varying(20),
    formula text NOT NULL,
    formula_raw text,
    error text,
    deleted boolean,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    parsed_tree text,
    base_id character varying(20)
);


ALTER TABLE public.nc_col_formula_v2 OWNER TO bullpadel_user;

--
-- Name: nc_col_lookup_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_col_lookup_v2 (
    id character varying(20) NOT NULL,
    fk_column_id character varying(20),
    fk_relation_column_id character varying(20),
    fk_lookup_column_id character varying(20),
    deleted boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    base_id character varying(20)
);


ALTER TABLE public.nc_col_lookup_v2 OWNER TO bullpadel_user;

--
-- Name: nc_col_qrcode_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_col_qrcode_v2 (
    id character varying(20) NOT NULL,
    fk_column_id character varying(20),
    fk_qr_value_column_id character varying(20),
    deleted boolean,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    base_id character varying(20)
);


ALTER TABLE public.nc_col_qrcode_v2 OWNER TO bullpadel_user;

--
-- Name: nc_col_relations_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_col_relations_v2 (
    id character varying(20) NOT NULL,
    ref_db_alias character varying(255),
    type character varying(255),
    virtual boolean,
    db_type character varying(255),
    fk_column_id character varying(20),
    fk_related_model_id character varying(20),
    fk_child_column_id character varying(20),
    fk_parent_column_id character varying(20),
    fk_mm_model_id character varying(20),
    fk_mm_child_column_id character varying(20),
    fk_mm_parent_column_id character varying(20),
    ur character varying(255),
    dr character varying(255),
    fk_index_name character varying(255),
    deleted boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fk_target_view_id character varying(20),
    base_id character varying(20)
);


ALTER TABLE public.nc_col_relations_v2 OWNER TO bullpadel_user;

--
-- Name: nc_col_rollup_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_col_rollup_v2 (
    id character varying(20) NOT NULL,
    fk_column_id character varying(20),
    fk_relation_column_id character varying(20),
    fk_rollup_column_id character varying(20),
    rollup_function character varying(255),
    deleted boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    base_id character varying(20)
);


ALTER TABLE public.nc_col_rollup_v2 OWNER TO bullpadel_user;

--
-- Name: nc_col_select_options_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_col_select_options_v2 (
    id character varying(20) NOT NULL,
    fk_column_id character varying(20),
    title character varying(255),
    color character varying(255),
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    base_id character varying(20)
);


ALTER TABLE public.nc_col_select_options_v2 OWNER TO bullpadel_user;

--
-- Name: nc_columns_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_columns_v2 (
    id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    fk_model_id character varying(20),
    title character varying(255),
    column_name character varying(255),
    uidt character varying(255),
    dt character varying(255),
    np character varying(255),
    ns character varying(255),
    clen character varying(255),
    cop character varying(255),
    pk boolean,
    pv boolean,
    rqd boolean,
    un boolean,
    ct text,
    ai boolean,
    "unique" boolean,
    cdf text,
    cc text,
    csn character varying(255),
    dtx character varying(255),
    dtxp text,
    dtxs character varying(255),
    au boolean,
    validate text,
    virtual boolean,
    deleted boolean,
    system boolean DEFAULT false,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    meta text,
    description text
);


ALTER TABLE public.nc_columns_v2 OWNER TO bullpadel_user;

--
-- Name: nc_comment_reactions; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_comment_reactions (
    id character varying(20) NOT NULL,
    row_id character varying(255),
    comment_id character varying(20),
    source_id character varying(20),
    fk_model_id character varying(20),
    base_id character varying(20),
    reaction character varying(255),
    created_by character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_comment_reactions OWNER TO bullpadel_user;

--
-- Name: nc_comments; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_comments (
    id character varying(20) NOT NULL,
    row_id character varying(255),
    comment text,
    created_by character varying(20),
    created_by_email character varying(255),
    resolved_by character varying(20),
    resolved_by_email character varying(255),
    parent_comment_id character varying(20),
    source_id character varying(20),
    base_id character varying(20),
    fk_model_id character varying(20),
    is_deleted boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_comments OWNER TO bullpadel_user;

--
-- Name: nc_disabled_models_for_role_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_disabled_models_for_role_v2 (
    id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    fk_view_id character varying(20),
    role character varying(45),
    disabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_disabled_models_for_role_v2 OWNER TO bullpadel_user;

--
-- Name: nc_extensions; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_extensions (
    id character varying(20) NOT NULL,
    base_id character varying(20),
    fk_user_id character varying(20),
    extension_id character varying(255),
    title character varying(255),
    kv_store text,
    meta text,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_extensions OWNER TO bullpadel_user;

--
-- Name: nc_file_references; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_file_references (
    id character varying(20) NOT NULL,
    storage character varying(255),
    file_url text,
    file_size integer,
    fk_user_id character varying(20),
    fk_workspace_id character varying(20),
    base_id character varying(20),
    source_id character varying(20),
    fk_model_id character varying(20),
    fk_column_id character varying(20),
    is_external boolean DEFAULT false,
    deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_file_references OWNER TO bullpadel_user;

--
-- Name: nc_filter_exp_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_filter_exp_v2 (
    id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    fk_view_id character varying(20),
    fk_hook_id character varying(20),
    fk_column_id character varying(20),
    fk_parent_id character varying(20),
    logical_op character varying(255),
    comparison_op character varying(255),
    value text,
    is_group boolean,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    comparison_sub_op character varying(255),
    fk_link_col_id character varying(20),
    fk_value_col_id character varying(20),
    fk_parent_column_id character varying(20)
);


ALTER TABLE public.nc_filter_exp_v2 OWNER TO bullpadel_user;

--
-- Name: nc_form_view_columns_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_form_view_columns_v2 (
    id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    fk_view_id character varying(20),
    fk_column_id character varying(20),
    uuid character varying(255),
    label text,
    help text,
    description text,
    required boolean,
    show boolean,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    meta text,
    enable_scanner boolean
);


ALTER TABLE public.nc_form_view_columns_v2 OWNER TO bullpadel_user;

--
-- Name: nc_form_view_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_form_view_v2 (
    source_id character varying(20),
    base_id character varying(20),
    fk_view_id character varying(20) NOT NULL,
    heading character varying(255),
    subheading text,
    success_msg text,
    redirect_url text,
    redirect_after_secs character varying(255),
    email character varying(255),
    submit_another_form boolean,
    show_blank_form boolean,
    uuid character varying(255),
    banner_image_url text,
    logo_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    meta text
);


ALTER TABLE public.nc_form_view_v2 OWNER TO bullpadel_user;

--
-- Name: nc_gallery_view_columns_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_gallery_view_columns_v2 (
    id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    fk_view_id character varying(20),
    fk_column_id character varying(20),
    uuid character varying(255),
    label character varying(255),
    help character varying(255),
    show boolean,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_gallery_view_columns_v2 OWNER TO bullpadel_user;

--
-- Name: nc_gallery_view_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_gallery_view_v2 (
    source_id character varying(20),
    base_id character varying(20),
    fk_view_id character varying(20) NOT NULL,
    next_enabled boolean,
    prev_enabled boolean,
    cover_image_idx integer,
    fk_cover_image_col_id character varying(20),
    cover_image character varying(255),
    restrict_types character varying(255),
    restrict_size character varying(255),
    restrict_number character varying(255),
    public boolean,
    dimensions character varying(255),
    responsive_columns character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    meta text
);


ALTER TABLE public.nc_gallery_view_v2 OWNER TO bullpadel_user;

--
-- Name: nc_grid_view_columns_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_grid_view_columns_v2 (
    id character varying(20) NOT NULL,
    fk_view_id character varying(20),
    fk_column_id character varying(20),
    source_id character varying(20),
    base_id character varying(20),
    uuid character varying(255),
    label character varying(255),
    help character varying(255),
    width character varying(255) DEFAULT '200px'::character varying,
    show boolean,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    group_by boolean,
    group_by_order real,
    group_by_sort character varying(255),
    aggregation character varying(30) DEFAULT NULL::character varying
);


ALTER TABLE public.nc_grid_view_columns_v2 OWNER TO bullpadel_user;

--
-- Name: nc_grid_view_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_grid_view_v2 (
    fk_view_id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    uuid character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    meta text,
    row_height integer
);


ALTER TABLE public.nc_grid_view_v2 OWNER TO bullpadel_user;

--
-- Name: nc_hook_logs_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_hook_logs_v2 (
    id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    fk_hook_id character varying(20),
    type character varying(255),
    event character varying(255),
    operation character varying(255),
    test_call boolean DEFAULT true,
    payload text,
    conditions text,
    notification text,
    error_code character varying(255),
    error_message character varying(255),
    error text,
    execution_time integer,
    response text,
    triggered_by character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_hook_logs_v2 OWNER TO bullpadel_user;

--
-- Name: nc_hooks_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_hooks_v2 (
    id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    fk_model_id character varying(20),
    title character varying(255),
    description character varying(255),
    env character varying(255) DEFAULT 'all'::character varying,
    type character varying(255),
    event character varying(255),
    operation character varying(255),
    async boolean DEFAULT false,
    payload boolean DEFAULT true,
    url text,
    headers text,
    condition boolean DEFAULT false,
    notification text,
    retries integer DEFAULT 0,
    retry_interval integer DEFAULT 60000,
    timeout integer DEFAULT 60000,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version character varying(255)
);


ALTER TABLE public.nc_hooks_v2 OWNER TO bullpadel_user;

--
-- Name: nc_integrations_store_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_integrations_store_v2 (
    id character varying(20) NOT NULL,
    fk_integration_id character varying(20),
    type character varying(20),
    sub_type character varying(20),
    fk_workspace_id character varying(20),
    fk_user_id character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    slot_0 text,
    slot_1 text,
    slot_2 text,
    slot_3 text,
    slot_4 text,
    slot_5 integer,
    slot_6 integer,
    slot_7 integer,
    slot_8 integer,
    slot_9 integer
);


ALTER TABLE public.nc_integrations_store_v2 OWNER TO bullpadel_user;

--
-- Name: nc_integrations_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_integrations_v2 (
    id character varying(20) NOT NULL,
    title character varying(128),
    config text,
    meta text,
    type character varying(20),
    sub_type character varying(20),
    is_private boolean DEFAULT false,
    deleted boolean DEFAULT false,
    created_by character varying(20),
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_default boolean DEFAULT false,
    is_encrypted boolean DEFAULT false
);


ALTER TABLE public.nc_integrations_v2 OWNER TO bullpadel_user;

--
-- Name: nc_jobs; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_jobs (
    id character varying(20) NOT NULL,
    job character varying(255),
    status character varying(20),
    result text,
    fk_user_id character varying(20),
    fk_workspace_id character varying(20),
    base_id character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_jobs OWNER TO bullpadel_user;

--
-- Name: nc_kanban_view_columns_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_kanban_view_columns_v2 (
    id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    fk_view_id character varying(20),
    fk_column_id character varying(20),
    uuid character varying(255),
    label character varying(255),
    help character varying(255),
    show boolean,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_kanban_view_columns_v2 OWNER TO bullpadel_user;

--
-- Name: nc_kanban_view_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_kanban_view_v2 (
    fk_view_id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    show boolean,
    "order" real,
    uuid character varying(255),
    title character varying(255),
    public boolean,
    password character varying(255),
    show_all_fields boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fk_grp_col_id character varying(20),
    fk_cover_image_col_id character varying(20),
    meta text
);


ALTER TABLE public.nc_kanban_view_v2 OWNER TO bullpadel_user;

--
-- Name: nc_map_view_columns_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_map_view_columns_v2 (
    id character varying(20) NOT NULL,
    base_id character varying(20),
    project_id character varying(128),
    fk_view_id character varying(20),
    fk_column_id character varying(20),
    uuid character varying(255),
    label character varying(255),
    help character varying(255),
    show boolean,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_map_view_columns_v2 OWNER TO bullpadel_user;

--
-- Name: nc_map_view_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_map_view_v2 (
    fk_view_id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    uuid character varying(255),
    title character varying(255),
    fk_geo_data_col_id character varying(20),
    meta text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.nc_map_view_v2 OWNER TO bullpadel_user;

--
-- Name: nc_models_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_models_v2 (
    id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    table_name character varying(255),
    title character varying(255),
    type character varying(255) DEFAULT 'table'::character varying,
    meta text,
    schema text,
    enabled boolean DEFAULT true,
    mm boolean DEFAULT false,
    tags character varying(255),
    pinned boolean,
    deleted boolean,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text
);


ALTER TABLE public.nc_models_v2 OWNER TO bullpadel_user;

--
-- Name: nc_orgs_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_orgs_v2 (
    id character varying(20) NOT NULL,
    title character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_orgs_v2 OWNER TO bullpadel_user;

--
-- Name: nc_plugins_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_plugins_v2 (
    id character varying(20) NOT NULL,
    title character varying(45),
    description text,
    active boolean DEFAULT false,
    rating real,
    version character varying(255),
    docs character varying(255),
    status character varying(255) DEFAULT 'install'::character varying,
    status_details character varying(255),
    logo character varying(255),
    icon character varying(255),
    tags character varying(255),
    category character varying(255),
    input_schema text,
    input text,
    creator character varying(255),
    creator_website character varying(255),
    price character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_plugins_v2 OWNER TO bullpadel_user;

--
-- Name: nc_shared_bases; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_shared_bases (
    id integer NOT NULL,
    project_id character varying(255),
    db_alias character varying(255),
    roles character varying(255) DEFAULT 'viewer'::character varying,
    shared_base_id character varying(255),
    enabled boolean DEFAULT true,
    password character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_shared_bases OWNER TO bullpadel_user;

--
-- Name: nc_shared_bases_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.nc_shared_bases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.nc_shared_bases_id_seq OWNER TO bullpadel_user;

--
-- Name: nc_shared_bases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.nc_shared_bases_id_seq OWNED BY public.nc_shared_bases.id;


--
-- Name: nc_shared_views_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_shared_views_v2 (
    id character varying(20) NOT NULL,
    fk_view_id character varying(20),
    meta text,
    query_params text,
    view_id character varying(255),
    show_all_fields boolean,
    allow_copy boolean,
    password character varying(255),
    deleted boolean,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_shared_views_v2 OWNER TO bullpadel_user;

--
-- Name: nc_sort_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_sort_v2 (
    id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    fk_view_id character varying(20),
    fk_column_id character varying(20),
    direction character varying(255) DEFAULT 'false'::character varying,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_sort_v2 OWNER TO bullpadel_user;

--
-- Name: nc_sources_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_sources_v2 (
    id character varying(20) NOT NULL,
    base_id character varying(20),
    alias character varying(255),
    config text,
    meta text,
    is_meta boolean,
    type character varying(255),
    inflection_column character varying(255),
    inflection_table character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    enabled boolean DEFAULT true,
    "order" real,
    description character varying(255),
    erd_uuid character varying(255),
    deleted boolean DEFAULT false,
    is_schema_readonly boolean DEFAULT false,
    is_data_readonly boolean DEFAULT false,
    fk_integration_id character varying(20),
    is_local boolean DEFAULT false,
    is_encrypted boolean DEFAULT false
);


ALTER TABLE public.nc_sources_v2 OWNER TO bullpadel_user;

--
-- Name: nc_store; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_store (
    id integer NOT NULL,
    base_id character varying(255),
    db_alias character varying(255) DEFAULT 'db'::character varying,
    key character varying(255),
    value text,
    type character varying(255),
    env character varying(255),
    tag character varying(255),
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.nc_store OWNER TO bullpadel_user;

--
-- Name: nc_store_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.nc_store_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.nc_store_id_seq OWNER TO bullpadel_user;

--
-- Name: nc_store_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.nc_store_id_seq OWNED BY public.nc_store.id;


--
-- Name: nc_sync_logs_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_sync_logs_v2 (
    id character varying(20) NOT NULL,
    base_id character varying(20),
    fk_sync_source_id character varying(20),
    time_taken integer,
    status character varying(255),
    status_details text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_sync_logs_v2 OWNER TO bullpadel_user;

--
-- Name: nc_sync_source_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_sync_source_v2 (
    id character varying(20) NOT NULL,
    title character varying(255),
    type character varying(255),
    details text,
    deleted boolean,
    enabled boolean DEFAULT true,
    "order" real,
    base_id character varying(20),
    fk_user_id character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    source_id character varying(20)
);


ALTER TABLE public.nc_sync_source_v2 OWNER TO bullpadel_user;

--
-- Name: nc_team_users_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_team_users_v2 (
    org_id character varying(20),
    user_id character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_team_users_v2 OWNER TO bullpadel_user;

--
-- Name: nc_teams_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_teams_v2 (
    id character varying(20) NOT NULL,
    title character varying(255),
    org_id character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_teams_v2 OWNER TO bullpadel_user;

--
-- Name: nc_user_comment_notifications_preference; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_user_comment_notifications_preference (
    id character varying(20) NOT NULL,
    row_id character varying(255),
    user_id character varying(20),
    fk_model_id character varying(20),
    source_id character varying(20),
    base_id character varying(20),
    preferences character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_user_comment_notifications_preference OWNER TO bullpadel_user;

--
-- Name: nc_user_refresh_tokens; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_user_refresh_tokens (
    fk_user_id character varying(20),
    token character varying(255),
    meta text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.nc_user_refresh_tokens OWNER TO bullpadel_user;

--
-- Name: nc_users_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_users_v2 (
    id character varying(20) NOT NULL,
    email character varying(255),
    password character varying(255),
    salt character varying(255),
    invite_token character varying(255),
    invite_token_expires character varying(255),
    reset_password_expires timestamp with time zone,
    reset_password_token character varying(255),
    email_verification_token character varying(255),
    email_verified boolean,
    roles character varying(255) DEFAULT 'editor'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    token_version character varying(255),
    display_name character varying(255),
    user_name character varying(255),
    blocked boolean DEFAULT false,
    blocked_reason character varying(255)
);


ALTER TABLE public.nc_users_v2 OWNER TO bullpadel_user;

--
-- Name: nc_views_v2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.nc_views_v2 (
    id character varying(20) NOT NULL,
    source_id character varying(20),
    base_id character varying(20),
    fk_model_id character varying(20),
    title character varying(255),
    type integer,
    is_default boolean,
    show_system_fields boolean,
    lock_type character varying(255) DEFAULT 'collaborative'::character varying,
    uuid character varying(255),
    password character varying(255),
    show boolean,
    "order" real,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    meta text,
    description text
);


ALTER TABLE public.nc_views_v2 OWNER TO bullpadel_user;

--
-- Name: notas_crm; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.notas_crm (
    id integer NOT NULL,
    contacto_id integer,
    contenido text NOT NULL,
    revisada boolean DEFAULT false,
    usuario_id integer,
    fecha_creacion timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notas_crm OWNER TO bullpadel_user;

--
-- Name: notas_crm_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.notas_crm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notas_crm_id_seq OWNER TO bullpadel_user;

--
-- Name: notas_crm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.notas_crm_id_seq OWNED BY public.notas_crm.id;


--
-- Name: notification; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.notification (
    id character varying(20) NOT NULL,
    type character varying(40),
    body text,
    is_read boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    fk_user_id character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notification OWNER TO bullpadel_user;

--
-- Name: plantillas_email; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.plantillas_email (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    asunto character varying(255),
    contenido_html text NOT NULL,
    creado_por integer,
    fecha_creacion timestamp with time zone DEFAULT now()
);


ALTER TABLE public.plantillas_email OWNER TO bullpadel_user;

--
-- Name: plantillas_email_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.plantillas_email_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.plantillas_email_id_seq OWNER TO bullpadel_user;

--
-- Name: plantillas_email_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.plantillas_email_id_seq OWNED BY public.plantillas_email.id;


--
-- Name: programa_clientes; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.programa_clientes (
    id integer NOT NULL,
    tipo_cliente character varying(20) NOT NULL,
    card character varying(100),
    activo boolean DEFAULT true,
    customer_id character varying(100),
    numero_tarjeta character varying(100),
    numero_tarjeta_ext character varying(100),
    nombre character varying(255),
    apellido character varying(255),
    telefono character varying(50),
    email character varying(255),
    opt_in_email boolean DEFAULT false,
    opt_in_sms boolean DEFAULT false,
    tiene_wallet boolean DEFAULT false,
    fecha_signup date,
    fecha_ultima_accion date,
    fecha_carga timestamp with time zone DEFAULT now(),
    cargado_por integer,
    CONSTRAINT programa_clientes_tipo_cliente_check CHECK (((tipo_cliente)::text = ANY ((ARRAY['blackbull'::character varying, 'gift_card'::character varying])::text[])))
);


ALTER TABLE public.programa_clientes OWNER TO bullpadel_user;

--
-- Name: programa_clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.programa_clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.programa_clientes_id_seq OWNER TO bullpadel_user;

--
-- Name: programa_clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.programa_clientes_id_seq OWNED BY public.programa_clientes.id;


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.push_subscriptions (
    id integer NOT NULL,
    usuario_id integer,
    subscription jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.push_subscriptions OWNER TO bullpadel_user;

--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.push_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.push_subscriptions_id_seq OWNER TO bullpadel_user;

--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.push_subscriptions_id_seq OWNED BY public.push_subscriptions.id;


--
-- Name: segmentos_email; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.segmentos_email (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    filtros jsonb NOT NULL,
    creado_por integer,
    fecha_creacion timestamp with time zone DEFAULT now()
);


ALTER TABLE public.segmentos_email OWNER TO bullpadel_user;

--
-- Name: segmentos_email_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.segmentos_email_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.segmentos_email_id_seq OWNER TO bullpadel_user;

--
-- Name: segmentos_email_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.segmentos_email_id_seq OWNED BY public.segmentos_email.id;


--
-- Name: upload_tokens; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.upload_tokens (
    id integer NOT NULL,
    token character varying(64) NOT NULL,
    usuario_id integer,
    usado boolean DEFAULT false,
    expira_en timestamp with time zone NOT NULL,
    creado_en timestamp with time zone DEFAULT now()
);


ALTER TABLE public.upload_tokens OWNER TO bullpadel_user;

--
-- Name: upload_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.upload_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.upload_tokens_id_seq OWNER TO bullpadel_user;

--
-- Name: upload_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.upload_tokens_id_seq OWNED BY public.upload_tokens.id;


--
-- Name: usuarios_crm; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.usuarios_crm (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol character varying(20) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    ultimo_acceso timestamp with time zone,
    puede_eliminar boolean DEFAULT false,
    CONSTRAINT usuarios_crm_rol_check CHECK (((rol)::text = ANY ((ARRAY['ventas'::character varying, 'comercial'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.usuarios_crm OWNER TO bullpadel_user;

--
-- Name: usuarios_crm_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.usuarios_crm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.usuarios_crm_id_seq OWNER TO bullpadel_user;

--
-- Name: usuarios_crm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.usuarios_crm_id_seq OWNED BY public.usuarios_crm.id;


--
-- Name: xc_knex_migrations; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.xc_knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE public.xc_knex_migrations OWNER TO bullpadel_user;

--
-- Name: xc_knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.xc_knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.xc_knex_migrations_id_seq OWNER TO bullpadel_user;

--
-- Name: xc_knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.xc_knex_migrations_id_seq OWNED BY public.xc_knex_migrations.id;


--
-- Name: xc_knex_migrations_lock; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.xc_knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


ALTER TABLE public.xc_knex_migrations_lock OWNER TO bullpadel_user;

--
-- Name: xc_knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.xc_knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.xc_knex_migrations_lock_index_seq OWNER TO bullpadel_user;

--
-- Name: xc_knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.xc_knex_migrations_lock_index_seq OWNED BY public.xc_knex_migrations_lock.index;


--
-- Name: xc_knex_migrationsv2; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.xc_knex_migrationsv2 (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE public.xc_knex_migrationsv2 OWNER TO bullpadel_user;

--
-- Name: xc_knex_migrationsv2_id_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.xc_knex_migrationsv2_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.xc_knex_migrationsv2_id_seq OWNER TO bullpadel_user;

--
-- Name: xc_knex_migrationsv2_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.xc_knex_migrationsv2_id_seq OWNED BY public.xc_knex_migrationsv2.id;


--
-- Name: xc_knex_migrationsv2_lock; Type: TABLE; Schema: public; Owner: bullpadel_user
--

CREATE TABLE public.xc_knex_migrationsv2_lock (
    index integer NOT NULL,
    is_locked integer
);


ALTER TABLE public.xc_knex_migrationsv2_lock OWNER TO bullpadel_user;

--
-- Name: xc_knex_migrationsv2_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: bullpadel_user
--

CREATE SEQUENCE public.xc_knex_migrationsv2_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.xc_knex_migrationsv2_lock_index_seq OWNER TO bullpadel_user;

--
-- Name: xc_knex_migrationsv2_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bullpadel_user
--

ALTER SEQUENCE public.xc_knex_migrationsv2_lock_index_seq OWNED BY public.xc_knex_migrationsv2_lock.index;


--
-- Name: activity_log id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.activity_log ALTER COLUMN id SET DEFAULT nextval('public.activity_log_id_seq'::regclass);


--
-- Name: campanas_email id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.campanas_email ALTER COLUMN id SET DEFAULT nextval('public.campanas_email_id_seq'::regclass);


--
-- Name: compras_crm id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.compras_crm ALTER COLUMN id SET DEFAULT nextval('public.compras_crm_id_seq'::regclass);


--
-- Name: configuracion_integraciones id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.configuracion_integraciones ALTER COLUMN id SET DEFAULT nextval('public.configuracion_integraciones_id_seq'::regclass);


--
-- Name: contactos id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.contactos ALTER COLUMN id SET DEFAULT nextval('public.contactos_id_seq'::regclass);


--
-- Name: etiquetas id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.etiquetas ALTER COLUMN id SET DEFAULT nextval('public.etiquetas_id_seq'::regclass);


--
-- Name: historial_conversaciones id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.historial_conversaciones ALTER COLUMN id SET DEFAULT nextval('public.historial_conversaciones_id_seq'::regclass);


--
-- Name: leads_vinculados id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.leads_vinculados ALTER COLUMN id SET DEFAULT nextval('public.leads_vinculados_id_seq'::regclass);


--
-- Name: login_attempts id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.login_attempts ALTER COLUMN id SET DEFAULT nextval('public.login_attempts_id_seq'::regclass);


--
-- Name: nc_api_tokens id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_api_tokens ALTER COLUMN id SET DEFAULT nextval('public.nc_api_tokens_id_seq'::regclass);


--
-- Name: nc_shared_bases id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_shared_bases ALTER COLUMN id SET DEFAULT nextval('public.nc_shared_bases_id_seq'::regclass);


--
-- Name: nc_store id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_store ALTER COLUMN id SET DEFAULT nextval('public.nc_store_id_seq'::regclass);


--
-- Name: notas_crm id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.notas_crm ALTER COLUMN id SET DEFAULT nextval('public.notas_crm_id_seq'::regclass);


--
-- Name: plantillas_email id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.plantillas_email ALTER COLUMN id SET DEFAULT nextval('public.plantillas_email_id_seq'::regclass);


--
-- Name: programa_clientes id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.programa_clientes ALTER COLUMN id SET DEFAULT nextval('public.programa_clientes_id_seq'::regclass);


--
-- Name: push_subscriptions id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.push_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.push_subscriptions_id_seq'::regclass);


--
-- Name: segmentos_email id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.segmentos_email ALTER COLUMN id SET DEFAULT nextval('public.segmentos_email_id_seq'::regclass);


--
-- Name: upload_tokens id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.upload_tokens ALTER COLUMN id SET DEFAULT nextval('public.upload_tokens_id_seq'::regclass);


--
-- Name: usuarios_crm id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.usuarios_crm ALTER COLUMN id SET DEFAULT nextval('public.usuarios_crm_id_seq'::regclass);


--
-- Name: xc_knex_migrations id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.xc_knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.xc_knex_migrations_id_seq'::regclass);


--
-- Name: xc_knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.xc_knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.xc_knex_migrations_lock_index_seq'::regclass);


--
-- Name: xc_knex_migrationsv2 id; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.xc_knex_migrationsv2 ALTER COLUMN id SET DEFAULT nextval('public.xc_knex_migrationsv2_id_seq'::regclass);


--
-- Name: xc_knex_migrationsv2_lock index; Type: DEFAULT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.xc_knex_migrationsv2_lock ALTER COLUMN index SET DEFAULT nextval('public.xc_knex_migrationsv2_lock_index_seq'::regclass);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: campanas_email campanas_email_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.campanas_email
    ADD CONSTRAINT campanas_email_pkey PRIMARY KEY (id);


--
-- Name: compras_crm compras_crm_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.compras_crm
    ADD CONSTRAINT compras_crm_pkey PRIMARY KEY (id);


--
-- Name: configuracion_integraciones configuracion_integraciones_clave_key; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.configuracion_integraciones
    ADD CONSTRAINT configuracion_integraciones_clave_key UNIQUE (clave);


--
-- Name: configuracion_integraciones configuracion_integraciones_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.configuracion_integraciones
    ADD CONSTRAINT configuracion_integraciones_pkey PRIMARY KEY (id);


--
-- Name: contacto_etiquetas contacto_etiquetas_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.contacto_etiquetas
    ADD CONSTRAINT contacto_etiquetas_pkey PRIMARY KEY (contacto_id, etiqueta_id);


--
-- Name: contactos contactos_canal_user_id_canal_key; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.contactos
    ADD CONSTRAINT contactos_canal_user_id_canal_key UNIQUE (canal_user_id, canal);


--
-- Name: contactos contactos_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.contactos
    ADD CONSTRAINT contactos_pkey PRIMARY KEY (id);


--
-- Name: etiquetas etiquetas_nombre_key; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.etiquetas
    ADD CONSTRAINT etiquetas_nombre_key UNIQUE (nombre);


--
-- Name: etiquetas etiquetas_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.etiquetas
    ADD CONSTRAINT etiquetas_pkey PRIMARY KEY (id);


--
-- Name: historial_conversaciones historial_conversaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.historial_conversaciones
    ADD CONSTRAINT historial_conversaciones_pkey PRIMARY KEY (id);


--
-- Name: leads_vinculados leads_vinculados_contacto_principal_id_contacto_vinculado_i_key; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.leads_vinculados
    ADD CONSTRAINT leads_vinculados_contacto_principal_id_contacto_vinculado_i_key UNIQUE (contacto_principal_id, contacto_vinculado_id);


--
-- Name: leads_vinculados leads_vinculados_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.leads_vinculados
    ADD CONSTRAINT leads_vinculados_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: nc_api_tokens nc_api_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_api_tokens
    ADD CONSTRAINT nc_api_tokens_pkey PRIMARY KEY (id);


--
-- Name: nc_audit_v2 nc_audit_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_audit_v2
    ADD CONSTRAINT nc_audit_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_base_users_v2 nc_base_users_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_base_users_v2
    ADD CONSTRAINT nc_base_users_v2_pkey PRIMARY KEY (base_id, fk_user_id);


--
-- Name: nc_sources_v2 nc_bases_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_sources_v2
    ADD CONSTRAINT nc_bases_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_calendar_view_columns_v2 nc_calendar_view_columns_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_calendar_view_columns_v2
    ADD CONSTRAINT nc_calendar_view_columns_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_calendar_view_range_v2 nc_calendar_view_range_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_calendar_view_range_v2
    ADD CONSTRAINT nc_calendar_view_range_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_calendar_view_v2 nc_calendar_view_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_calendar_view_v2
    ADD CONSTRAINT nc_calendar_view_v2_pkey PRIMARY KEY (fk_view_id);


--
-- Name: nc_col_barcode_v2 nc_col_barcode_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_col_barcode_v2
    ADD CONSTRAINT nc_col_barcode_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_col_formula_v2 nc_col_formula_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_col_formula_v2
    ADD CONSTRAINT nc_col_formula_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_col_lookup_v2 nc_col_lookup_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_col_lookup_v2
    ADD CONSTRAINT nc_col_lookup_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_col_qrcode_v2 nc_col_qrcode_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_col_qrcode_v2
    ADD CONSTRAINT nc_col_qrcode_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_col_relations_v2 nc_col_relations_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_col_relations_v2
    ADD CONSTRAINT nc_col_relations_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_col_rollup_v2 nc_col_rollup_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_col_rollup_v2
    ADD CONSTRAINT nc_col_rollup_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_col_select_options_v2 nc_col_select_options_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_col_select_options_v2
    ADD CONSTRAINT nc_col_select_options_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_columns_v2 nc_columns_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_columns_v2
    ADD CONSTRAINT nc_columns_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_comment_reactions nc_comment_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_comment_reactions
    ADD CONSTRAINT nc_comment_reactions_pkey PRIMARY KEY (id);


--
-- Name: nc_comments nc_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_comments
    ADD CONSTRAINT nc_comments_pkey PRIMARY KEY (id);


--
-- Name: nc_disabled_models_for_role_v2 nc_disabled_models_for_role_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_disabled_models_for_role_v2
    ADD CONSTRAINT nc_disabled_models_for_role_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_extensions nc_extensions_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_extensions
    ADD CONSTRAINT nc_extensions_pkey PRIMARY KEY (id);


--
-- Name: nc_file_references nc_file_references_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_file_references
    ADD CONSTRAINT nc_file_references_pkey PRIMARY KEY (id);


--
-- Name: nc_filter_exp_v2 nc_filter_exp_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_filter_exp_v2
    ADD CONSTRAINT nc_filter_exp_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_form_view_columns_v2 nc_form_view_columns_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_form_view_columns_v2
    ADD CONSTRAINT nc_form_view_columns_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_form_view_v2 nc_form_view_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_form_view_v2
    ADD CONSTRAINT nc_form_view_v2_pkey PRIMARY KEY (fk_view_id);


--
-- Name: nc_gallery_view_columns_v2 nc_gallery_view_columns_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_gallery_view_columns_v2
    ADD CONSTRAINT nc_gallery_view_columns_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_gallery_view_v2 nc_gallery_view_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_gallery_view_v2
    ADD CONSTRAINT nc_gallery_view_v2_pkey PRIMARY KEY (fk_view_id);


--
-- Name: nc_grid_view_columns_v2 nc_grid_view_columns_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_grid_view_columns_v2
    ADD CONSTRAINT nc_grid_view_columns_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_grid_view_v2 nc_grid_view_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_grid_view_v2
    ADD CONSTRAINT nc_grid_view_v2_pkey PRIMARY KEY (fk_view_id);


--
-- Name: nc_hook_logs_v2 nc_hook_logs_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_hook_logs_v2
    ADD CONSTRAINT nc_hook_logs_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_hooks_v2 nc_hooks_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_hooks_v2
    ADD CONSTRAINT nc_hooks_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_integrations_store_v2 nc_integrations_store_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_integrations_store_v2
    ADD CONSTRAINT nc_integrations_store_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_integrations_v2 nc_integrations_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_integrations_v2
    ADD CONSTRAINT nc_integrations_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_jobs nc_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_jobs
    ADD CONSTRAINT nc_jobs_pkey PRIMARY KEY (id);


--
-- Name: nc_kanban_view_columns_v2 nc_kanban_view_columns_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_kanban_view_columns_v2
    ADD CONSTRAINT nc_kanban_view_columns_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_kanban_view_v2 nc_kanban_view_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_kanban_view_v2
    ADD CONSTRAINT nc_kanban_view_v2_pkey PRIMARY KEY (fk_view_id);


--
-- Name: nc_map_view_columns_v2 nc_map_view_columns_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_map_view_columns_v2
    ADD CONSTRAINT nc_map_view_columns_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_map_view_v2 nc_map_view_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_map_view_v2
    ADD CONSTRAINT nc_map_view_v2_pkey PRIMARY KEY (fk_view_id);


--
-- Name: nc_models_v2 nc_models_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_models_v2
    ADD CONSTRAINT nc_models_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_orgs_v2 nc_orgs_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_orgs_v2
    ADD CONSTRAINT nc_orgs_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_plugins_v2 nc_plugins_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_plugins_v2
    ADD CONSTRAINT nc_plugins_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_bases_v2 nc_projects_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_bases_v2
    ADD CONSTRAINT nc_projects_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_shared_bases nc_shared_bases_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_shared_bases
    ADD CONSTRAINT nc_shared_bases_pkey PRIMARY KEY (id);


--
-- Name: nc_shared_views_v2 nc_shared_views_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_shared_views_v2
    ADD CONSTRAINT nc_shared_views_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_sort_v2 nc_sort_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_sort_v2
    ADD CONSTRAINT nc_sort_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_store nc_store_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_store
    ADD CONSTRAINT nc_store_pkey PRIMARY KEY (id);


--
-- Name: nc_sync_logs_v2 nc_sync_logs_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_sync_logs_v2
    ADD CONSTRAINT nc_sync_logs_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_sync_source_v2 nc_sync_source_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_sync_source_v2
    ADD CONSTRAINT nc_sync_source_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_teams_v2 nc_teams_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_teams_v2
    ADD CONSTRAINT nc_teams_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_user_comment_notifications_preference nc_user_comment_notifications_preference_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_user_comment_notifications_preference
    ADD CONSTRAINT nc_user_comment_notifications_preference_pkey PRIMARY KEY (id);


--
-- Name: nc_users_v2 nc_users_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_users_v2
    ADD CONSTRAINT nc_users_v2_pkey PRIMARY KEY (id);


--
-- Name: nc_views_v2 nc_views_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_views_v2
    ADD CONSTRAINT nc_views_v2_pkey PRIMARY KEY (id);


--
-- Name: notas_crm notas_crm_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.notas_crm
    ADD CONSTRAINT notas_crm_pkey PRIMARY KEY (id);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: plantillas_email plantillas_email_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.plantillas_email
    ADD CONSTRAINT plantillas_email_pkey PRIMARY KEY (id);


--
-- Name: programa_clientes programa_clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.programa_clientes
    ADD CONSTRAINT programa_clientes_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: segmentos_email segmentos_email_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.segmentos_email
    ADD CONSTRAINT segmentos_email_pkey PRIMARY KEY (id);


--
-- Name: upload_tokens upload_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.upload_tokens
    ADD CONSTRAINT upload_tokens_pkey PRIMARY KEY (id);


--
-- Name: upload_tokens upload_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.upload_tokens
    ADD CONSTRAINT upload_tokens_token_key UNIQUE (token);


--
-- Name: usuarios_crm usuarios_crm_email_key; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.usuarios_crm
    ADD CONSTRAINT usuarios_crm_email_key UNIQUE (email);


--
-- Name: usuarios_crm usuarios_crm_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.usuarios_crm
    ADD CONSTRAINT usuarios_crm_pkey PRIMARY KEY (id);


--
-- Name: xc_knex_migrations_lock xc_knex_migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.xc_knex_migrations_lock
    ADD CONSTRAINT xc_knex_migrations_lock_pkey PRIMARY KEY (index);


--
-- Name: xc_knex_migrations xc_knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.xc_knex_migrations
    ADD CONSTRAINT xc_knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: xc_knex_migrationsv2_lock xc_knex_migrationsv2_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.xc_knex_migrationsv2_lock
    ADD CONSTRAINT xc_knex_migrationsv2_lock_pkey PRIMARY KEY (index);


--
-- Name: xc_knex_migrationsv2 xc_knex_migrationsv2_pkey; Type: CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.xc_knex_migrationsv2
    ADD CONSTRAINT xc_knex_migrationsv2_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_log_contacto; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX idx_activity_log_contacto ON public.activity_log USING btree (contacto_id, "timestamp" DESC);


--
-- Name: idx_campanas_email_segmento_id; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX idx_campanas_email_segmento_id ON public.campanas_email USING btree (segmento_id);


--
-- Name: idx_compras_crm_fecha_compra; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX idx_compras_crm_fecha_compra ON public.compras_crm USING btree (fecha_compra);


--
-- Name: idx_compras_crm_medio_pago; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX idx_compras_crm_medio_pago ON public.compras_crm USING btree (medio_pago);


--
-- Name: idx_compras_crm_vendedor_id; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX idx_compras_crm_vendedor_id ON public.compras_crm USING btree (vendedor_id);


--
-- Name: idx_contactos_estado; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX idx_contactos_estado ON public.contactos USING btree (estado_lead);


--
-- Name: idx_contactos_vendedor; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX idx_contactos_vendedor ON public.contactos USING btree (vendedor_asignado_id);


--
-- Name: idx_historial_contacto; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX idx_historial_contacto ON public.historial_conversaciones USING btree (id_contacto, "timestamp");


--
-- Name: idx_login_attempts_ip; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX idx_login_attempts_ip ON public.login_attempts USING btree (ip);


--
-- Name: idx_notas_crm_contacto_id; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX idx_notas_crm_contacto_id ON public.notas_crm USING btree (contacto_id);


--
-- Name: idx_programa_clientes_email; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX idx_programa_clientes_email ON public.programa_clientes USING btree (email);


--
-- Name: idx_programa_clientes_tipo; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX idx_programa_clientes_tipo ON public.programa_clientes USING btree (tipo_cliente);


--
-- Name: idx_push_sub_usuario_endpoint; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE UNIQUE INDEX idx_push_sub_usuario_endpoint ON public.push_subscriptions USING btree (usuario_id, ((subscription ->> 'endpoint'::text)));


--
-- Name: idx_upload_tokens_token; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX idx_upload_tokens_token ON public.upload_tokens USING btree (token);


--
-- Name: nc_api_tokens_fk_user_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_api_tokens_fk_user_id_index ON public.nc_api_tokens USING btree (fk_user_id);


--
-- Name: nc_audit_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_audit_v2_base_id_index ON public.nc_audit_v2 USING btree (base_id);


--
-- Name: nc_audit_v2_fk_model_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_audit_v2_fk_model_id_index ON public.nc_audit_v2 USING btree (fk_model_id);


--
-- Name: nc_audit_v2_row_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_audit_v2_row_id_index ON public.nc_audit_v2 USING btree (row_id);


--
-- Name: nc_base_users_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_base_users_v2_base_id_index ON public.nc_base_users_v2 USING btree (base_id);


--
-- Name: nc_base_users_v2_invited_by_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_base_users_v2_invited_by_index ON public.nc_base_users_v2 USING btree (invited_by);


--
-- Name: nc_calendar_view_columns_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_calendar_view_columns_v2_base_id_index ON public.nc_calendar_view_columns_v2 USING btree (base_id);


--
-- Name: nc_calendar_view_columns_v2_fk_view_id_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_calendar_view_columns_v2_fk_view_id_fk_column_id_index ON public.nc_calendar_view_columns_v2 USING btree (fk_view_id, fk_column_id);


--
-- Name: nc_calendar_view_range_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_calendar_view_range_v2_base_id_index ON public.nc_calendar_view_range_v2 USING btree (base_id);


--
-- Name: nc_calendar_view_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_calendar_view_v2_base_id_index ON public.nc_calendar_view_v2 USING btree (base_id);


--
-- Name: nc_col_barcode_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_barcode_v2_base_id_index ON public.nc_col_barcode_v2 USING btree (base_id);


--
-- Name: nc_col_barcode_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_barcode_v2_fk_column_id_index ON public.nc_col_barcode_v2 USING btree (fk_column_id);


--
-- Name: nc_col_formula_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_formula_v2_base_id_index ON public.nc_col_formula_v2 USING btree (base_id);


--
-- Name: nc_col_formula_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_formula_v2_fk_column_id_index ON public.nc_col_formula_v2 USING btree (fk_column_id);


--
-- Name: nc_col_lookup_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_lookup_v2_base_id_index ON public.nc_col_lookup_v2 USING btree (base_id);


--
-- Name: nc_col_lookup_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_lookup_v2_fk_column_id_index ON public.nc_col_lookup_v2 USING btree (fk_column_id);


--
-- Name: nc_col_lookup_v2_fk_lookup_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_lookup_v2_fk_lookup_column_id_index ON public.nc_col_lookup_v2 USING btree (fk_lookup_column_id);


--
-- Name: nc_col_lookup_v2_fk_relation_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_lookup_v2_fk_relation_column_id_index ON public.nc_col_lookup_v2 USING btree (fk_relation_column_id);


--
-- Name: nc_col_qrcode_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_qrcode_v2_base_id_index ON public.nc_col_qrcode_v2 USING btree (base_id);


--
-- Name: nc_col_qrcode_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_qrcode_v2_fk_column_id_index ON public.nc_col_qrcode_v2 USING btree (fk_column_id);


--
-- Name: nc_col_relations_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_relations_v2_base_id_index ON public.nc_col_relations_v2 USING btree (base_id);


--
-- Name: nc_col_relations_v2_fk_child_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_relations_v2_fk_child_column_id_index ON public.nc_col_relations_v2 USING btree (fk_child_column_id);


--
-- Name: nc_col_relations_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_relations_v2_fk_column_id_index ON public.nc_col_relations_v2 USING btree (fk_column_id);


--
-- Name: nc_col_relations_v2_fk_mm_child_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_relations_v2_fk_mm_child_column_id_index ON public.nc_col_relations_v2 USING btree (fk_mm_child_column_id);


--
-- Name: nc_col_relations_v2_fk_mm_model_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_relations_v2_fk_mm_model_id_index ON public.nc_col_relations_v2 USING btree (fk_mm_model_id);


--
-- Name: nc_col_relations_v2_fk_mm_parent_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_relations_v2_fk_mm_parent_column_id_index ON public.nc_col_relations_v2 USING btree (fk_mm_parent_column_id);


--
-- Name: nc_col_relations_v2_fk_parent_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_relations_v2_fk_parent_column_id_index ON public.nc_col_relations_v2 USING btree (fk_parent_column_id);


--
-- Name: nc_col_relations_v2_fk_related_model_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_relations_v2_fk_related_model_id_index ON public.nc_col_relations_v2 USING btree (fk_related_model_id);


--
-- Name: nc_col_relations_v2_fk_target_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_relations_v2_fk_target_view_id_index ON public.nc_col_relations_v2 USING btree (fk_target_view_id);


--
-- Name: nc_col_rollup_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_rollup_v2_base_id_index ON public.nc_col_rollup_v2 USING btree (base_id);


--
-- Name: nc_col_rollup_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_rollup_v2_fk_column_id_index ON public.nc_col_rollup_v2 USING btree (fk_column_id);


--
-- Name: nc_col_rollup_v2_fk_relation_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_rollup_v2_fk_relation_column_id_index ON public.nc_col_rollup_v2 USING btree (fk_relation_column_id);


--
-- Name: nc_col_rollup_v2_fk_rollup_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_rollup_v2_fk_rollup_column_id_index ON public.nc_col_rollup_v2 USING btree (fk_rollup_column_id);


--
-- Name: nc_col_select_options_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_select_options_v2_base_id_index ON public.nc_col_select_options_v2 USING btree (base_id);


--
-- Name: nc_col_select_options_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_col_select_options_v2_fk_column_id_index ON public.nc_col_select_options_v2 USING btree (fk_column_id);


--
-- Name: nc_columns_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_columns_v2_base_id_index ON public.nc_columns_v2 USING btree (base_id);


--
-- Name: nc_columns_v2_fk_model_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_columns_v2_fk_model_id_index ON public.nc_columns_v2 USING btree (fk_model_id);


--
-- Name: nc_comment_reactions_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_comment_reactions_base_id_index ON public.nc_comment_reactions USING btree (base_id);


--
-- Name: nc_comment_reactions_comment_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_comment_reactions_comment_id_index ON public.nc_comment_reactions USING btree (comment_id);


--
-- Name: nc_comment_reactions_row_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_comment_reactions_row_id_index ON public.nc_comment_reactions USING btree (row_id);


--
-- Name: nc_comments_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_comments_base_id_index ON public.nc_comments USING btree (base_id);


--
-- Name: nc_comments_row_id_fk_model_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_comments_row_id_fk_model_id_index ON public.nc_comments USING btree (row_id, fk_model_id);


--
-- Name: nc_disabled_models_for_role_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_disabled_models_for_role_v2_base_id_index ON public.nc_disabled_models_for_role_v2 USING btree (base_id);


--
-- Name: nc_disabled_models_for_role_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_disabled_models_for_role_v2_fk_view_id_index ON public.nc_disabled_models_for_role_v2 USING btree (fk_view_id);


--
-- Name: nc_extensions_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_extensions_base_id_index ON public.nc_extensions USING btree (base_id);


--
-- Name: nc_file_references_temp; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_file_references_temp ON public.nc_file_references USING btree (file_url, storage);


--
-- Name: nc_filter_exp_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_filter_exp_v2_base_id_index ON public.nc_filter_exp_v2 USING btree (base_id);


--
-- Name: nc_filter_exp_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_filter_exp_v2_fk_column_id_index ON public.nc_filter_exp_v2 USING btree (fk_column_id);


--
-- Name: nc_filter_exp_v2_fk_hook_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_filter_exp_v2_fk_hook_id_index ON public.nc_filter_exp_v2 USING btree (fk_hook_id);


--
-- Name: nc_filter_exp_v2_fk_link_col_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_filter_exp_v2_fk_link_col_id_index ON public.nc_filter_exp_v2 USING btree (fk_link_col_id);


--
-- Name: nc_filter_exp_v2_fk_parent_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_filter_exp_v2_fk_parent_column_id_index ON public.nc_filter_exp_v2 USING btree (fk_parent_column_id);


--
-- Name: nc_filter_exp_v2_fk_parent_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_filter_exp_v2_fk_parent_id_index ON public.nc_filter_exp_v2 USING btree (fk_parent_id);


--
-- Name: nc_filter_exp_v2_fk_value_col_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_filter_exp_v2_fk_value_col_id_index ON public.nc_filter_exp_v2 USING btree (fk_value_col_id);


--
-- Name: nc_filter_exp_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_filter_exp_v2_fk_view_id_index ON public.nc_filter_exp_v2 USING btree (fk_view_id);


--
-- Name: nc_form_view_columns_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_form_view_columns_v2_base_id_index ON public.nc_form_view_columns_v2 USING btree (base_id);


--
-- Name: nc_form_view_columns_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_form_view_columns_v2_fk_column_id_index ON public.nc_form_view_columns_v2 USING btree (fk_column_id);


--
-- Name: nc_form_view_columns_v2_fk_view_id_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_form_view_columns_v2_fk_view_id_fk_column_id_index ON public.nc_form_view_columns_v2 USING btree (fk_view_id, fk_column_id);


--
-- Name: nc_form_view_columns_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_form_view_columns_v2_fk_view_id_index ON public.nc_form_view_columns_v2 USING btree (fk_view_id);


--
-- Name: nc_form_view_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_form_view_v2_base_id_index ON public.nc_form_view_v2 USING btree (base_id);


--
-- Name: nc_form_view_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_form_view_v2_fk_view_id_index ON public.nc_form_view_v2 USING btree (fk_view_id);


--
-- Name: nc_gallery_view_columns_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_gallery_view_columns_v2_base_id_index ON public.nc_gallery_view_columns_v2 USING btree (base_id);


--
-- Name: nc_gallery_view_columns_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_gallery_view_columns_v2_fk_column_id_index ON public.nc_gallery_view_columns_v2 USING btree (fk_column_id);


--
-- Name: nc_gallery_view_columns_v2_fk_view_id_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_gallery_view_columns_v2_fk_view_id_fk_column_id_index ON public.nc_gallery_view_columns_v2 USING btree (fk_view_id, fk_column_id);


--
-- Name: nc_gallery_view_columns_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_gallery_view_columns_v2_fk_view_id_index ON public.nc_gallery_view_columns_v2 USING btree (fk_view_id);


--
-- Name: nc_gallery_view_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_gallery_view_v2_base_id_index ON public.nc_gallery_view_v2 USING btree (base_id);


--
-- Name: nc_gallery_view_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_gallery_view_v2_fk_view_id_index ON public.nc_gallery_view_v2 USING btree (fk_view_id);


--
-- Name: nc_grid_view_columns_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_grid_view_columns_v2_base_id_index ON public.nc_grid_view_columns_v2 USING btree (base_id);


--
-- Name: nc_grid_view_columns_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_grid_view_columns_v2_fk_column_id_index ON public.nc_grid_view_columns_v2 USING btree (fk_column_id);


--
-- Name: nc_grid_view_columns_v2_fk_view_id_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_grid_view_columns_v2_fk_view_id_fk_column_id_index ON public.nc_grid_view_columns_v2 USING btree (fk_view_id, fk_column_id);


--
-- Name: nc_grid_view_columns_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_grid_view_columns_v2_fk_view_id_index ON public.nc_grid_view_columns_v2 USING btree (fk_view_id);


--
-- Name: nc_grid_view_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_grid_view_v2_base_id_index ON public.nc_grid_view_v2 USING btree (base_id);


--
-- Name: nc_grid_view_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_grid_view_v2_fk_view_id_index ON public.nc_grid_view_v2 USING btree (fk_view_id);


--
-- Name: nc_hook_logs_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_hook_logs_v2_base_id_index ON public.nc_hook_logs_v2 USING btree (base_id);


--
-- Name: nc_hooks_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_hooks_v2_base_id_index ON public.nc_hooks_v2 USING btree (base_id);


--
-- Name: nc_hooks_v2_fk_model_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_hooks_v2_fk_model_id_index ON public.nc_hooks_v2 USING btree (fk_model_id);


--
-- Name: nc_integrations_store_v2_fk_integration_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_integrations_store_v2_fk_integration_id_index ON public.nc_integrations_store_v2 USING btree (fk_integration_id);


--
-- Name: nc_integrations_v2_created_by_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_integrations_v2_created_by_index ON public.nc_integrations_v2 USING btree (created_by);


--
-- Name: nc_integrations_v2_type_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_integrations_v2_type_index ON public.nc_integrations_v2 USING btree (type);


--
-- Name: nc_kanban_view_columns_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_kanban_view_columns_v2_base_id_index ON public.nc_kanban_view_columns_v2 USING btree (base_id);


--
-- Name: nc_kanban_view_columns_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_kanban_view_columns_v2_fk_column_id_index ON public.nc_kanban_view_columns_v2 USING btree (fk_column_id);


--
-- Name: nc_kanban_view_columns_v2_fk_view_id_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_kanban_view_columns_v2_fk_view_id_fk_column_id_index ON public.nc_kanban_view_columns_v2 USING btree (fk_view_id, fk_column_id);


--
-- Name: nc_kanban_view_columns_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_kanban_view_columns_v2_fk_view_id_index ON public.nc_kanban_view_columns_v2 USING btree (fk_view_id);


--
-- Name: nc_kanban_view_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_kanban_view_v2_base_id_index ON public.nc_kanban_view_v2 USING btree (base_id);


--
-- Name: nc_kanban_view_v2_fk_grp_col_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_kanban_view_v2_fk_grp_col_id_index ON public.nc_kanban_view_v2 USING btree (fk_grp_col_id);


--
-- Name: nc_kanban_view_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_kanban_view_v2_fk_view_id_index ON public.nc_kanban_view_v2 USING btree (fk_view_id);


--
-- Name: nc_map_view_columns_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_map_view_columns_v2_base_id_index ON public.nc_map_view_columns_v2 USING btree (base_id);


--
-- Name: nc_map_view_columns_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_map_view_columns_v2_fk_column_id_index ON public.nc_map_view_columns_v2 USING btree (fk_column_id);


--
-- Name: nc_map_view_columns_v2_fk_view_id_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_map_view_columns_v2_fk_view_id_fk_column_id_index ON public.nc_map_view_columns_v2 USING btree (fk_view_id, fk_column_id);


--
-- Name: nc_map_view_columns_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_map_view_columns_v2_fk_view_id_index ON public.nc_map_view_columns_v2 USING btree (fk_view_id);


--
-- Name: nc_map_view_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_map_view_v2_base_id_index ON public.nc_map_view_v2 USING btree (base_id);


--
-- Name: nc_map_view_v2_fk_geo_data_col_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_map_view_v2_fk_geo_data_col_id_index ON public.nc_map_view_v2 USING btree (fk_geo_data_col_id);


--
-- Name: nc_map_view_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_map_view_v2_fk_view_id_index ON public.nc_map_view_v2 USING btree (fk_view_id);


--
-- Name: nc_models_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_models_v2_base_id_index ON public.nc_models_v2 USING btree (base_id);


--
-- Name: nc_models_v2_source_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_models_v2_source_id_index ON public.nc_models_v2 USING btree (source_id);


--
-- Name: nc_project_users_v2_fk_user_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_project_users_v2_fk_user_id_index ON public.nc_base_users_v2 USING btree (fk_user_id);


--
-- Name: nc_shared_views_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_shared_views_v2_fk_view_id_index ON public.nc_shared_views_v2 USING btree (fk_view_id);


--
-- Name: nc_sort_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_sort_v2_base_id_index ON public.nc_sort_v2 USING btree (base_id);


--
-- Name: nc_sort_v2_fk_column_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_sort_v2_fk_column_id_index ON public.nc_sort_v2 USING btree (fk_column_id);


--
-- Name: nc_sort_v2_fk_view_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_sort_v2_fk_view_id_index ON public.nc_sort_v2 USING btree (fk_view_id);


--
-- Name: nc_sources_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_sources_v2_base_id_index ON public.nc_sources_v2 USING btree (base_id);


--
-- Name: nc_sources_v2_fk_integration_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_sources_v2_fk_integration_id_index ON public.nc_sources_v2 USING btree (fk_integration_id);


--
-- Name: nc_store_key_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_store_key_index ON public.nc_store USING btree (key);


--
-- Name: nc_sync_logs_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_sync_logs_v2_base_id_index ON public.nc_sync_logs_v2 USING btree (base_id);


--
-- Name: nc_sync_source_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_sync_source_v2_base_id_index ON public.nc_sync_source_v2 USING btree (base_id);


--
-- Name: nc_sync_source_v2_source_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_sync_source_v2_source_id_index ON public.nc_sync_source_v2 USING btree (source_id);


--
-- Name: nc_user_comment_notifications_preference_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_user_comment_notifications_preference_base_id_index ON public.nc_user_comment_notifications_preference USING btree (base_id);


--
-- Name: nc_user_refresh_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_user_refresh_tokens_expires_at_index ON public.nc_user_refresh_tokens USING btree (expires_at);


--
-- Name: nc_user_refresh_tokens_fk_user_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_user_refresh_tokens_fk_user_id_index ON public.nc_user_refresh_tokens USING btree (fk_user_id);


--
-- Name: nc_user_refresh_tokens_token_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_user_refresh_tokens_token_index ON public.nc_user_refresh_tokens USING btree (token);


--
-- Name: nc_views_v2_base_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_views_v2_base_id_index ON public.nc_views_v2 USING btree (base_id);


--
-- Name: nc_views_v2_fk_model_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX nc_views_v2_fk_model_id_index ON public.nc_views_v2 USING btree (fk_model_id);


--
-- Name: notification_created_at_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX notification_created_at_index ON public.notification USING btree (created_at);


--
-- Name: notification_fk_user_id_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX notification_fk_user_id_index ON public.notification USING btree (fk_user_id);


--
-- Name: user_comments_preference_index; Type: INDEX; Schema: public; Owner: bullpadel_user
--

CREATE INDEX user_comments_preference_index ON public.nc_user_comment_notifications_preference USING btree (user_id, row_id, fk_model_id);


--
-- Name: contactos trigger_lead_score; Type: TRIGGER; Schema: public; Owner: bullpadel_user
--

CREATE TRIGGER trigger_lead_score BEFORE INSERT OR UPDATE ON public.contactos FOR EACH ROW EXECUTE FUNCTION public.calcular_lead_score();


--
-- Name: activity_log activity_log_contacto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_contacto_id_fkey FOREIGN KEY (contacto_id) REFERENCES public.contactos(id);


--
-- Name: activity_log activity_log_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios_crm(id);


--
-- Name: campanas_email campanas_email_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.campanas_email
    ADD CONSTRAINT campanas_email_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios_crm(id);


--
-- Name: campanas_email campanas_email_segmento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.campanas_email
    ADD CONSTRAINT campanas_email_segmento_id_fkey FOREIGN KEY (segmento_id) REFERENCES public.segmentos_email(id);


--
-- Name: compras_crm compras_crm_contacto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.compras_crm
    ADD CONSTRAINT compras_crm_contacto_id_fkey FOREIGN KEY (contacto_id) REFERENCES public.contactos(id);


--
-- Name: compras_crm compras_crm_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.compras_crm
    ADD CONSTRAINT compras_crm_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.usuarios_crm(id);


--
-- Name: configuracion_integraciones configuracion_integraciones_actualizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.configuracion_integraciones
    ADD CONSTRAINT configuracion_integraciones_actualizado_por_fkey FOREIGN KEY (actualizado_por) REFERENCES public.usuarios_crm(id);


--
-- Name: contacto_etiquetas contacto_etiquetas_contacto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.contacto_etiquetas
    ADD CONSTRAINT contacto_etiquetas_contacto_id_fkey FOREIGN KEY (contacto_id) REFERENCES public.contactos(id) ON DELETE CASCADE;


--
-- Name: contacto_etiquetas contacto_etiquetas_etiqueta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.contacto_etiquetas
    ADD CONSTRAINT contacto_etiquetas_etiqueta_id_fkey FOREIGN KEY (etiqueta_id) REFERENCES public.etiquetas(id) ON DELETE CASCADE;


--
-- Name: contactos contactos_vendedor_asignado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.contactos
    ADD CONSTRAINT contactos_vendedor_asignado_id_fkey FOREIGN KEY (vendedor_asignado_id) REFERENCES public.usuarios_crm(id);


--
-- Name: etiquetas etiquetas_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.etiquetas
    ADD CONSTRAINT etiquetas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios_crm(id);


--
-- Name: historial_conversaciones historial_conversaciones_id_contacto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.historial_conversaciones
    ADD CONSTRAINT historial_conversaciones_id_contacto_fkey FOREIGN KEY (id_contacto) REFERENCES public.contactos(id) ON DELETE CASCADE;


--
-- Name: leads_vinculados leads_vinculados_contacto_principal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.leads_vinculados
    ADD CONSTRAINT leads_vinculados_contacto_principal_id_fkey FOREIGN KEY (contacto_principal_id) REFERENCES public.contactos(id) ON DELETE CASCADE;


--
-- Name: leads_vinculados leads_vinculados_contacto_vinculado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.leads_vinculados
    ADD CONSTRAINT leads_vinculados_contacto_vinculado_id_fkey FOREIGN KEY (contacto_vinculado_id) REFERENCES public.contactos(id) ON DELETE CASCADE;


--
-- Name: leads_vinculados leads_vinculados_vinculado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.leads_vinculados
    ADD CONSTRAINT leads_vinculados_vinculado_por_fkey FOREIGN KEY (vinculado_por) REFERENCES public.usuarios_crm(id);


--
-- Name: nc_team_users_v2 nc_team_users_v2_org_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_team_users_v2
    ADD CONSTRAINT nc_team_users_v2_org_id_foreign FOREIGN KEY (org_id) REFERENCES public.nc_orgs_v2(id);


--
-- Name: nc_team_users_v2 nc_team_users_v2_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_team_users_v2
    ADD CONSTRAINT nc_team_users_v2_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.nc_users_v2(id);


--
-- Name: nc_teams_v2 nc_teams_v2_org_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.nc_teams_v2
    ADD CONSTRAINT nc_teams_v2_org_id_foreign FOREIGN KEY (org_id) REFERENCES public.nc_orgs_v2(id);


--
-- Name: notas_crm notas_crm_contacto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.notas_crm
    ADD CONSTRAINT notas_crm_contacto_id_fkey FOREIGN KEY (contacto_id) REFERENCES public.contactos(id);


--
-- Name: notas_crm notas_crm_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.notas_crm
    ADD CONSTRAINT notas_crm_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios_crm(id);


--
-- Name: plantillas_email plantillas_email_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.plantillas_email
    ADD CONSTRAINT plantillas_email_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios_crm(id);


--
-- Name: programa_clientes programa_clientes_cargado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.programa_clientes
    ADD CONSTRAINT programa_clientes_cargado_por_fkey FOREIGN KEY (cargado_por) REFERENCES public.usuarios_crm(id);


--
-- Name: push_subscriptions push_subscriptions_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios_crm(id) ON DELETE CASCADE;


--
-- Name: segmentos_email segmentos_email_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.segmentos_email
    ADD CONSTRAINT segmentos_email_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios_crm(id);


--
-- Name: upload_tokens upload_tokens_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bullpadel_user
--

ALTER TABLE ONLY public.upload_tokens
    ADD CONSTRAINT upload_tokens_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios_crm(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 9JvpwAfDnpK3RZ5bqvFm53GbDYWHq6mloUAVAIeWDPzmcfF9KoOEKZzfjPFJHNm

