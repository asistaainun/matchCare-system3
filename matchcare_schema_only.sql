--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-07-30 08:42:12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE IF EXISTS matchcare_fresh_db;
--
-- TOC entry 5419 (class 1262 OID 75691)
-- Name: matchcare_fresh_db; Type: DATABASE; Schema: -; Owner: -
--

CREATE DATABASE matchcare_fresh_db WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'English_United States.1252';


\connect matchcare_fresh_db

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3 (class 3079 OID 75703)
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- TOC entry 5420 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- TOC entry 4 (class 3079 OID 75784)
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- TOC entry 5421 (class 0 OID 0)
-- Dependencies: 4
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- TOC entry 2 (class 3079 OID 75692)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5422 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 337 (class 1255 OID 76239)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 233 (class 1259 OID 75819)
-- Name: allergen_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allergen_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    ontology_uri character varying(255),
    common_sources text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 232 (class 1259 OID 75818)
-- Name: allergen_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allergen_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5423 (class 0 OID 0)
-- Dependencies: 232
-- Name: allergen_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.allergen_types_id_seq OWNED BY public.allergen_types.id;


--
-- TOC entry 286 (class 1259 OID 92321)
-- Name: backup_ingredient_key_types_before_csv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_ingredient_key_types_before_csv (
    ingredient_id integer,
    key_type_id integer
);


--
-- TOC entry 284 (class 1259 OID 92266)
-- Name: backup_ingredient_key_types_before_migration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_ingredient_key_types_before_migration (
    ingredient_id integer,
    key_type_id integer
);


--
-- TOC entry 283 (class 1259 OID 92261)
-- Name: backup_ingredients_before_complete_migration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_ingredients_before_complete_migration (
    id integer,
    name character varying(255),
    what_it_does text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    description text
);


--
-- TOC entry 285 (class 1259 OID 92316)
-- Name: backup_ingredients_before_csv_import; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_ingredients_before_csv_import (
    id integer,
    name character varying(255),
    what_it_does text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    description text,
    ontology_uri character varying(255),
    actual_functions text,
    embedded_functions text,
    functional_categories text,
    is_key_ingredient boolean,
    usage_instructions text,
    pregnancy_safe boolean,
    alcohol_free boolean,
    fragrance_free boolean,
    silicone_free boolean,
    sulfate_free boolean,
    paraben_free boolean,
    explanation text,
    benefit text,
    safety text,
    alternative_names text,
    suitable_for_skin_types text,
    addresses_concerns text,
    provided_benefits text,
    sensitivities text
);


--
-- TOC entry 289 (class 1259 OID 92403)
-- Name: backup_products_before_ingredient_update; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_products_before_ingredient_update (
    id integer,
    name character varying(255),
    brand_id integer,
    product_type character varying(255),
    description text,
    how_to_use text,
    alcohol_free boolean,
    fragrance_free boolean,
    paraben_free boolean,
    sulfate_free boolean,
    silicone_free boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    is_active boolean,
    main_category character varying(100),
    subcategory character varying(100),
    local_image_path character varying(500),
    product_url text,
    bpom_number character varying(100),
    main_category_id integer,
    subcategory_id integer,
    image_urls text,
    key_ingredients_csv text,
    suitable_for_skin_types text[],
    addresses_concerns text[],
    ingredient_list text
);


--
-- TOC entry 229 (class 1259 OID 75792)
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    description text,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 228 (class 1259 OID 75791)
-- Name: brands_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.brands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5424 (class 0 OID 0)
-- Dependencies: 228
-- Name: brands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.brands_id_seq OWNED BY public.brands.id;


--
-- TOC entry 235 (class 1259 OID 75831)
-- Name: formulation_traits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.formulation_traits (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    ontology_uri character varying(255),
    excludes_allergen_type_id integer,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 234 (class 1259 OID 75830)
-- Name: formulation_traits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.formulation_traits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5425 (class 0 OID 0)
-- Dependencies: 234
-- Name: formulation_traits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.formulation_traits_id_seq OWNED BY public.formulation_traits.id;


--
-- TOC entry 270 (class 1259 OID 76173)
-- Name: guest_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guest_sessions (
    id integer NOT NULL,
    session_id character varying(255) NOT NULL,
    ip_address inet,
    user_agent text,
    expires_at timestamp without time zone,
    converted_to_user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 269 (class 1259 OID 76172)
-- Name: guest_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.guest_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5426 (class 0 OID 0)
-- Dependencies: 269
-- Name: guest_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.guest_sessions_id_seq OWNED BY public.guest_sessions.id;


--
-- TOC entry 239 (class 1259 OID 75856)
-- Name: ingredient_benefits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredient_benefits (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(100),
    ontology_uri character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 238 (class 1259 OID 75855)
-- Name: ingredient_benefits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ingredient_benefits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5427 (class 0 OID 0)
-- Dependencies: 238
-- Name: ingredient_benefits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ingredient_benefits_id_seq OWNED BY public.ingredient_benefits.id;


--
-- TOC entry 276 (class 1259 OID 76281)
-- Name: ingredient_benefits_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredient_benefits_map (
    id integer NOT NULL,
    ingredient_id integer,
    benefit_id integer,
    effectiveness_rating integer
);


--
-- TOC entry 275 (class 1259 OID 76280)
-- Name: ingredient_benefits_map_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ingredient_benefits_map_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5428 (class 0 OID 0)
-- Dependencies: 275
-- Name: ingredient_benefits_map_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ingredient_benefits_map_id_seq OWNED BY public.ingredient_benefits_map.id;


--
-- TOC entry 237 (class 1259 OID 75846)
-- Name: ingredient_functions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredient_functions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    ontology_uri character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 236 (class 1259 OID 75845)
-- Name: ingredient_functions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ingredient_functions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5429 (class 0 OID 0)
-- Dependencies: 236
-- Name: ingredient_functions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ingredient_functions_id_seq OWNED BY public.ingredient_functions.id;


--
-- TOC entry 274 (class 1259 OID 76262)
-- Name: ingredient_functions_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredient_functions_map (
    id integer NOT NULL,
    ingredient_id integer,
    function_id integer
);


--
-- TOC entry 273 (class 1259 OID 76261)
-- Name: ingredient_functions_map_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ingredient_functions_map_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5430 (class 0 OID 0)
-- Dependencies: 273
-- Name: ingredient_functions_map_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ingredient_functions_map_id_seq OWNED BY public.ingredient_functions_map.id;


--
-- TOC entry 277 (class 1259 OID 76302)
-- Name: ingredient_key_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredient_key_types (
    ingredient_id integer NOT NULL,
    key_type_id integer NOT NULL
);


--
-- TOC entry 254 (class 1259 OID 76008)
-- Name: ingredient_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredient_relationships (
    id integer NOT NULL,
    ingredient1_id integer,
    ingredient2_id integer,
    relationship_type character varying(50) NOT NULL,
    strength integer DEFAULT 1,
    source character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 253 (class 1259 OID 76007)
-- Name: ingredient_relationships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ingredient_relationships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5431 (class 0 OID 0)
-- Dependencies: 253
-- Name: ingredient_relationships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ingredient_relationships_id_seq OWNED BY public.ingredient_relationships.id;


--
-- TOC entry 249 (class 1259 OID 75955)
-- Name: ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredients (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    what_it_does text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    description text,
    ontology_uri character varying(255),
    actual_functions text,
    embedded_functions text,
    functional_categories text,
    is_key_ingredient boolean DEFAULT false,
    usage_instructions text,
    pregnancy_safe boolean,
    alcohol_free boolean,
    fragrance_free boolean,
    silicone_free boolean,
    sulfate_free boolean,
    paraben_free boolean,
    explanation text,
    benefit text,
    safety text,
    alternative_names text,
    suitable_for_skin_types text,
    addresses_concerns text,
    provided_benefits text,
    sensitivities text
);


--
-- TOC entry 248 (class 1259 OID 75954)
-- Name: ingredients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ingredients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5432 (class 0 OID 0)
-- Dependencies: 248
-- Name: ingredients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ingredients_id_seq OWNED BY public.ingredients.id;


--
-- TOC entry 291 (class 1259 OID 93603)
-- Name: key_ingredient_synonyms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.key_ingredient_synonyms (
    id integer NOT NULL,
    ttl_name character varying(100),
    db_name character varying(100),
    ontology_uri character varying(255)
);


--
-- TOC entry 290 (class 1259 OID 93602)
-- Name: key_ingredient_synonyms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.key_ingredient_synonyms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5433 (class 0 OID 0)
-- Dependencies: 290
-- Name: key_ingredient_synonyms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.key_ingredient_synonyms_id_seq OWNED BY public.key_ingredient_synonyms.id;


--
-- TOC entry 245 (class 1259 OID 75904)
-- Name: key_ingredient_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.key_ingredient_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    display_name character varying(100),
    description text,
    category character varying(50),
    usage_notes text,
    ontology_uri character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 244 (class 1259 OID 75903)
-- Name: key_ingredient_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.key_ingredient_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5434 (class 0 OID 0)
-- Dependencies: 244
-- Name: key_ingredient_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.key_ingredient_types_id_seq OWNED BY public.key_ingredient_types.id;


--
-- TOC entry 231 (class 1259 OID 75804)
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    ontology_uri character varying(255),
    parent_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 230 (class 1259 OID 75803)
-- Name: product_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5435 (class 0 OID 0)
-- Dependencies: 230
-- Name: product_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_categories_id_seq OWNED BY public.product_categories.id;


--
-- TOC entry 256 (class 1259 OID 76031)
-- Name: product_formulation_traits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_formulation_traits (
    id integer NOT NULL,
    product_id integer,
    trait_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 255 (class 1259 OID 76030)
-- Name: product_formulation_traits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_formulation_traits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5436 (class 0 OID 0)
-- Dependencies: 255
-- Name: product_formulation_traits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_formulation_traits_id_seq OWNED BY public.product_formulation_traits.id;


--
-- TOC entry 251 (class 1259 OID 75970)
-- Name: product_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_ingredients (
    id integer NOT NULL,
    product_id integer NOT NULL,
    ingredient_id integer NOT NULL,
    "position" integer,
    is_key_ingredient boolean DEFAULT false,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 287 (class 1259 OID 92358)
-- Name: product_ingredients_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_ingredients_backup (
    id integer,
    product_id integer,
    ingredient_id integer,
    "position" integer,
    is_key_ingredient boolean,
    notes text,
    created_at timestamp without time zone
);


--
-- TOC entry 250 (class 1259 OID 75969)
-- Name: product_ingredients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_ingredients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5437 (class 0 OID 0)
-- Dependencies: 250
-- Name: product_ingredients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_ingredients_id_seq OWNED BY public.product_ingredients.id;


--
-- TOC entry 252 (class 1259 OID 75992)
-- Name: product_key_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_key_ingredients (
    product_id integer NOT NULL,
    key_type_id integer NOT NULL
);


--
-- TOC entry 272 (class 1259 OID 76190)
-- Name: product_match_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_match_scores (
    id integer NOT NULL,
    user_profile_id integer,
    product_id integer,
    match_score integer,
    reasoning text,
    calculation_method character varying(50),
    calculated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone
);


--
-- TOC entry 271 (class 1259 OID 76189)
-- Name: product_match_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_match_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5438 (class 0 OID 0)
-- Dependencies: 271
-- Name: product_match_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_match_scores_id_seq OWNED BY public.product_match_scores.id;


--
-- TOC entry 247 (class 1259 OID 75923)
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    brand_id integer,
    product_type character varying(255),
    description text,
    how_to_use text,
    alcohol_free boolean DEFAULT false,
    fragrance_free boolean DEFAULT false,
    paraben_free boolean DEFAULT false,
    sulfate_free boolean DEFAULT false,
    silicone_free boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    main_category character varying(100),
    subcategory character varying(100),
    local_image_path character varying(500),
    product_url text,
    bpom_number character varying(100),
    main_category_id integer,
    subcategory_id integer,
    image_urls text,
    key_ingredients_csv text,
    suitable_for_skin_types text[] DEFAULT '{}'::text[],
    addresses_concerns text[] DEFAULT '{}'::text[],
    ingredient_list text
);


--
-- TOC entry 246 (class 1259 OID 75922)
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5439 (class 0 OID 0)
-- Dependencies: 246
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- TOC entry 282 (class 1259 OID 92225)
-- Name: quiz_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_results (
    id integer NOT NULL,
    session_id character varying(255),
    skin_type_id integer,
    concern_ids integer[],
    fragrance_sensitivity boolean DEFAULT false,
    alcohol_sensitivity boolean DEFAULT false,
    silicone_sensitivity boolean DEFAULT false,
    completed_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 281 (class 1259 OID 92224)
-- Name: quiz_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quiz_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5440 (class 0 OID 0)
-- Dependencies: 281
-- Name: quiz_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quiz_results_id_seq OWNED BY public.quiz_results.id;


--
-- TOC entry 280 (class 1259 OID 84137)
-- Name: recommendation_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recommendation_cache (
    id integer NOT NULL,
    quiz_result_id integer,
    product_id integer,
    match_score numeric(3,2) DEFAULT 0.0,
    reason_codes text[] DEFAULT '{}'::text[],
    rank_position integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 279 (class 1259 OID 84136)
-- Name: recommendation_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recommendation_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5441 (class 0 OID 0)
-- Dependencies: 279
-- Name: recommendation_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recommendation_cache_id_seq OWNED BY public.recommendation_cache.id;


--
-- TOC entry 243 (class 1259 OID 75894)
-- Name: skin_concerns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skin_concerns (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    ontology_uri character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 242 (class 1259 OID 75893)
-- Name: skin_concerns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skin_concerns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5442 (class 0 OID 0)
-- Dependencies: 242
-- Name: skin_concerns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skin_concerns_id_seq OWNED BY public.skin_concerns.id;


--
-- TOC entry 241 (class 1259 OID 75884)
-- Name: skin_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skin_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    ontology_uri character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 240 (class 1259 OID 75883)
-- Name: skin_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skin_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5443 (class 0 OID 0)
-- Dependencies: 240
-- Name: skin_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skin_types_id_seq OWNED BY public.skin_types.id;


--
-- TOC entry 288 (class 1259 OID 92398)
-- Name: temp_ingredient_update; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.temp_ingredient_update (
    product_name text,
    ingredient_list text
);


--
-- TOC entry 268 (class 1259 OID 76154)
-- Name: user_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_favorites (
    id integer NOT NULL,
    session_id character varying(255),
    user_id integer,
    product_id integer NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 267 (class 1259 OID 76153)
-- Name: user_favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_favorites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5444 (class 0 OID 0)
-- Dependencies: 267
-- Name: user_favorites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_favorites_id_seq OWNED BY public.user_favorites.id;


--
-- TOC entry 266 (class 1259 OID 76130)
-- Name: user_ingredient_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_ingredient_preferences (
    id integer NOT NULL,
    user_profile_id integer,
    ingredient_id integer,
    preference_type character varying(20),
    reason text,
    source character varying(50) DEFAULT 'manual'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_ingredient_preferences_preference_type_check CHECK (((preference_type)::text = ANY ((ARRAY['avoid'::character varying, 'like'::character varying, 'neutral'::character varying])::text[])))
);


--
-- TOC entry 265 (class 1259 OID 76129)
-- Name: user_ingredient_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_ingredient_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5445 (class 0 OID 0)
-- Dependencies: 265
-- Name: user_ingredient_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_ingredient_preferences_id_seq OWNED BY public.user_ingredient_preferences.id;


--
-- TOC entry 260 (class 1259 OID 76066)
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id integer NOT NULL,
    session_id character varying(255),
    user_id integer,
    skin_type_id integer NOT NULL,
    skin_concerns text,
    age_range character varying(20),
    gender character varying(20),
    avoided_ingredients text,
    liked_ingredients text,
    quiz_version character varying(20),
    quiz_completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 259 (class 1259 OID 76065)
-- Name: user_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5446 (class 0 OID 0)
-- Dependencies: 259
-- Name: user_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_profiles_id_seq OWNED BY public.user_profiles.id;


--
-- TOC entry 262 (class 1259 OID 76087)
-- Name: user_sensitivities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sensitivities (
    id integer NOT NULL,
    user_profile_id integer,
    allergen_type_id integer,
    severity character varying(20) DEFAULT 'avoid'::character varying,
    source character varying(50) DEFAULT 'quiz'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 261 (class 1259 OID 76086)
-- Name: user_sensitivities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_sensitivities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5447 (class 0 OID 0)
-- Dependencies: 261
-- Name: user_sensitivities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_sensitivities_id_seq OWNED BY public.user_sensitivities.id;


--
-- TOC entry 278 (class 1259 OID 84100)
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_data jsonb DEFAULT '{}'::jsonb,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '30 days'::interval),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 264 (class 1259 OID 76109)
-- Name: user_skin_concerns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_skin_concerns (
    id integer NOT NULL,
    user_profile_id integer,
    skin_concern_id integer,
    priority integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 263 (class 1259 OID 76108)
-- Name: user_skin_concerns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_skin_concerns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5448 (class 0 OID 0)
-- Dependencies: 263
-- Name: user_skin_concerns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_skin_concerns_id_seq OWNED BY public.user_skin_concerns.id;


--
-- TOC entry 258 (class 1259 OID 76051)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    email_verified boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 257 (class 1259 OID 76050)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5449 (class 0 OID 0)
-- Dependencies: 257
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4990 (class 2604 OID 75822)
-- Name: allergen_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergen_types ALTER COLUMN id SET DEFAULT nextval('public.allergen_types_id_seq'::regclass);


--
-- TOC entry 4987 (class 2604 OID 75795)
-- Name: brands id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands ALTER COLUMN id SET DEFAULT nextval('public.brands_id_seq'::regclass);


--
-- TOC entry 4992 (class 2604 OID 75834)
-- Name: formulation_traits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formulation_traits ALTER COLUMN id SET DEFAULT nextval('public.formulation_traits_id_seq'::regclass);


--
-- TOC entry 5046 (class 2604 OID 76176)
-- Name: guest_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_sessions ALTER COLUMN id SET DEFAULT nextval('public.guest_sessions_id_seq'::regclass);


--
-- TOC entry 4996 (class 2604 OID 75859)
-- Name: ingredient_benefits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_benefits ALTER COLUMN id SET DEFAULT nextval('public.ingredient_benefits_id_seq'::regclass);


--
-- TOC entry 5051 (class 2604 OID 76284)
-- Name: ingredient_benefits_map id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_benefits_map ALTER COLUMN id SET DEFAULT nextval('public.ingredient_benefits_map_id_seq'::regclass);


--
-- TOC entry 4994 (class 2604 OID 75849)
-- Name: ingredient_functions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_functions ALTER COLUMN id SET DEFAULT nextval('public.ingredient_functions_id_seq'::regclass);


--
-- TOC entry 5050 (class 2604 OID 76265)
-- Name: ingredient_functions_map id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_functions_map ALTER COLUMN id SET DEFAULT nextval('public.ingredient_functions_map_id_seq'::regclass);


--
-- TOC entry 5021 (class 2604 OID 76011)
-- Name: ingredient_relationships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_relationships ALTER COLUMN id SET DEFAULT nextval('public.ingredient_relationships_id_seq'::regclass);


--
-- TOC entry 5013 (class 2604 OID 75958)
-- Name: ingredients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients ALTER COLUMN id SET DEFAULT nextval('public.ingredients_id_seq'::regclass);


--
-- TOC entry 5067 (class 2604 OID 93606)
-- Name: key_ingredient_synonyms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_ingredient_synonyms ALTER COLUMN id SET DEFAULT nextval('public.key_ingredient_synonyms_id_seq'::regclass);


--
-- TOC entry 5002 (class 2604 OID 75907)
-- Name: key_ingredient_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_ingredient_types ALTER COLUMN id SET DEFAULT nextval('public.key_ingredient_types_id_seq'::regclass);


--
-- TOC entry 4988 (class 2604 OID 75807)
-- Name: product_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories ALTER COLUMN id SET DEFAULT nextval('public.product_categories_id_seq'::regclass);


--
-- TOC entry 5024 (class 2604 OID 76034)
-- Name: product_formulation_traits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_formulation_traits ALTER COLUMN id SET DEFAULT nextval('public.product_formulation_traits_id_seq'::regclass);


--
-- TOC entry 5018 (class 2604 OID 75973)
-- Name: product_ingredients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_ingredients ALTER COLUMN id SET DEFAULT nextval('public.product_ingredients_id_seq'::regclass);


--
-- TOC entry 5048 (class 2604 OID 76193)
-- Name: product_match_scores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_match_scores ALTER COLUMN id SET DEFAULT nextval('public.product_match_scores_id_seq'::regclass);


--
-- TOC entry 5004 (class 2604 OID 75926)
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- TOC entry 5061 (class 2604 OID 92228)
-- Name: quiz_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_results ALTER COLUMN id SET DEFAULT nextval('public.quiz_results_id_seq'::regclass);


--
-- TOC entry 5056 (class 2604 OID 84140)
-- Name: recommendation_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendation_cache ALTER COLUMN id SET DEFAULT nextval('public.recommendation_cache_id_seq'::regclass);


--
-- TOC entry 5000 (class 2604 OID 75897)
-- Name: skin_concerns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skin_concerns ALTER COLUMN id SET DEFAULT nextval('public.skin_concerns_id_seq'::regclass);


--
-- TOC entry 4998 (class 2604 OID 75887)
-- Name: skin_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skin_types ALTER COLUMN id SET DEFAULT nextval('public.skin_types_id_seq'::regclass);


--
-- TOC entry 5044 (class 2604 OID 76157)
-- Name: user_favorites id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites ALTER COLUMN id SET DEFAULT nextval('public.user_favorites_id_seq'::regclass);


--
-- TOC entry 5041 (class 2604 OID 76133)
-- Name: user_ingredient_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ingredient_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_ingredient_preferences_id_seq'::regclass);


--
-- TOC entry 5031 (class 2604 OID 76069)
-- Name: user_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_profiles_id_seq'::regclass);


--
-- TOC entry 5034 (class 2604 OID 76090)
-- Name: user_sensitivities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sensitivities ALTER COLUMN id SET DEFAULT nextval('public.user_sensitivities_id_seq'::regclass);


--
-- TOC entry 5038 (class 2604 OID 76112)
-- Name: user_skin_concerns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skin_concerns ALTER COLUMN id SET DEFAULT nextval('public.user_skin_concerns_id_seq'::regclass);


--
-- TOC entry 5026 (class 2604 OID 76054)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5089 (class 2606 OID 75829)
-- Name: allergen_types allergen_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergen_types
    ADD CONSTRAINT allergen_types_name_key UNIQUE (name);


--
-- TOC entry 5091 (class 2606 OID 75827)
-- Name: allergen_types allergen_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergen_types
    ADD CONSTRAINT allergen_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5070 (class 2606 OID 83952)
-- Name: brands brands_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_name_key UNIQUE (name);


--
-- TOC entry 5072 (class 2606 OID 83956)
-- Name: brands brands_name_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_name_key1 UNIQUE (name);


--
-- TOC entry 5074 (class 2606 OID 83958)
-- Name: brands brands_name_key2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_name_key2 UNIQUE (name);


--
-- TOC entry 5076 (class 2606 OID 83960)
-- Name: brands brands_name_key3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_name_key3 UNIQUE (name);


--
-- TOC entry 5078 (class 2606 OID 83954)
-- Name: brands brands_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_name_unique UNIQUE (name);


--
-- TOC entry 5080 (class 2606 OID 75800)
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- TOC entry 5093 (class 2606 OID 75839)
-- Name: formulation_traits formulation_traits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formulation_traits
    ADD CONSTRAINT formulation_traits_pkey PRIMARY KEY (id);


--
-- TOC entry 5197 (class 2606 OID 76181)
-- Name: guest_sessions guest_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_sessions
    ADD CONSTRAINT guest_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5199 (class 2606 OID 76183)
-- Name: guest_sessions guest_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_sessions
    ADD CONSTRAINT guest_sessions_session_id_key UNIQUE (session_id);


--
-- TOC entry 5213 (class 2606 OID 76288)
-- Name: ingredient_benefits_map ingredient_benefits_map_ingredient_id_benefit_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_benefits_map
    ADD CONSTRAINT ingredient_benefits_map_ingredient_id_benefit_id_key UNIQUE (ingredient_id, benefit_id);


--
-- TOC entry 5215 (class 2606 OID 76286)
-- Name: ingredient_benefits_map ingredient_benefits_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_benefits_map
    ADD CONSTRAINT ingredient_benefits_map_pkey PRIMARY KEY (id);


--
-- TOC entry 5100 (class 2606 OID 75864)
-- Name: ingredient_benefits ingredient_benefits_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_benefits
    ADD CONSTRAINT ingredient_benefits_name_key UNIQUE (name);


--
-- TOC entry 5102 (class 2606 OID 75862)
-- Name: ingredient_benefits ingredient_benefits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_benefits
    ADD CONSTRAINT ingredient_benefits_pkey PRIMARY KEY (id);


--
-- TOC entry 5208 (class 2606 OID 76269)
-- Name: ingredient_functions_map ingredient_functions_map_ingredient_id_function_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_functions_map
    ADD CONSTRAINT ingredient_functions_map_ingredient_id_function_id_key UNIQUE (ingredient_id, function_id);


--
-- TOC entry 5210 (class 2606 OID 76267)
-- Name: ingredient_functions_map ingredient_functions_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_functions_map
    ADD CONSTRAINT ingredient_functions_map_pkey PRIMARY KEY (id);


--
-- TOC entry 5096 (class 2606 OID 75854)
-- Name: ingredient_functions ingredient_functions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_functions
    ADD CONSTRAINT ingredient_functions_name_key UNIQUE (name);


--
-- TOC entry 5098 (class 2606 OID 75852)
-- Name: ingredient_functions ingredient_functions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_functions
    ADD CONSTRAINT ingredient_functions_pkey PRIMARY KEY (id);


--
-- TOC entry 5217 (class 2606 OID 76306)
-- Name: ingredient_key_types ingredient_key_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_key_types
    ADD CONSTRAINT ingredient_key_types_pkey PRIMARY KEY (ingredient_id, key_type_id);


--
-- TOC entry 5159 (class 2606 OID 76019)
-- Name: ingredient_relationships ingredient_relationships_ingredient1_id_ingredient2_id_rela_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_relationships
    ADD CONSTRAINT ingredient_relationships_ingredient1_id_ingredient2_id_rela_key UNIQUE (ingredient1_id, ingredient2_id, relationship_type);


--
-- TOC entry 5161 (class 2606 OID 76017)
-- Name: ingredient_relationships ingredient_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_relationships
    ADD CONSTRAINT ingredient_relationships_pkey PRIMARY KEY (id);


--
-- TOC entry 5138 (class 2606 OID 83987)
-- Name: ingredients ingredients_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_name_key UNIQUE (name);


--
-- TOC entry 5140 (class 2606 OID 83989)
-- Name: ingredients ingredients_name_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_name_key1 UNIQUE (name);


--
-- TOC entry 5142 (class 2606 OID 83991)
-- Name: ingredients ingredients_name_key2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_name_key2 UNIQUE (name);


--
-- TOC entry 5144 (class 2606 OID 83993)
-- Name: ingredients ingredients_name_key3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_name_key3 UNIQUE (name);


--
-- TOC entry 5146 (class 2606 OID 75966)
-- Name: ingredients ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_pkey PRIMARY KEY (id);


--
-- TOC entry 5228 (class 2606 OID 93608)
-- Name: key_ingredient_synonyms key_ingredient_synonyms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_ingredient_synonyms
    ADD CONSTRAINT key_ingredient_synonyms_pkey PRIMARY KEY (id);


--
-- TOC entry 5112 (class 2606 OID 75914)
-- Name: key_ingredient_types key_ingredient_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_ingredient_types
    ADD CONSTRAINT key_ingredient_types_name_key UNIQUE (name);


--
-- TOC entry 5114 (class 2606 OID 75912)
-- Name: key_ingredient_types key_ingredient_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_ingredient_types
    ADD CONSTRAINT key_ingredient_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5116 (class 2606 OID 75916)
-- Name: key_ingredient_types key_ingredient_types_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_ingredient_types
    ADD CONSTRAINT key_ingredient_types_slug_key UNIQUE (slug);


--
-- TOC entry 5085 (class 2606 OID 75812)
-- Name: product_categories product_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_name_key UNIQUE (name);


--
-- TOC entry 5087 (class 2606 OID 75810)
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5163 (class 2606 OID 76037)
-- Name: product_formulation_traits product_formulation_traits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_formulation_traits
    ADD CONSTRAINT product_formulation_traits_pkey PRIMARY KEY (id);


--
-- TOC entry 5165 (class 2606 OID 76039)
-- Name: product_formulation_traits product_formulation_traits_product_id_trait_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_formulation_traits
    ADD CONSTRAINT product_formulation_traits_product_id_trait_id_key UNIQUE (product_id, trait_id);


--
-- TOC entry 5151 (class 2606 OID 75979)
-- Name: product_ingredients product_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_ingredients
    ADD CONSTRAINT product_ingredients_pkey PRIMARY KEY (id);


--
-- TOC entry 5153 (class 2606 OID 75981)
-- Name: product_ingredients product_ingredients_product_id_ingredient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_ingredients
    ADD CONSTRAINT product_ingredients_product_id_ingredient_id_key UNIQUE (product_id, ingredient_id);


--
-- TOC entry 5155 (class 2606 OID 83599)
-- Name: product_ingredients product_ingredients_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_ingredients
    ADD CONSTRAINT product_ingredients_unique UNIQUE (product_id, ingredient_id);


--
-- TOC entry 5157 (class 2606 OID 75996)
-- Name: product_key_ingredients product_key_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_key_ingredients
    ADD CONSTRAINT product_key_ingredients_pkey PRIMARY KEY (product_id, key_type_id);


--
-- TOC entry 5203 (class 2606 OID 76198)
-- Name: product_match_scores product_match_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_match_scores
    ADD CONSTRAINT product_match_scores_pkey PRIMARY KEY (id);


--
-- TOC entry 5205 (class 2606 OID 76200)
-- Name: product_match_scores product_match_scores_user_profile_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_match_scores
    ADD CONSTRAINT product_match_scores_user_profile_id_product_id_key UNIQUE (user_profile_id, product_id);


--
-- TOC entry 5133 (class 2606 OID 75938)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 5226 (class 2606 OID 92237)
-- Name: quiz_results quiz_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_results
    ADD CONSTRAINT quiz_results_pkey PRIMARY KEY (id);


--
-- TOC entry 5222 (class 2606 OID 84148)
-- Name: recommendation_cache recommendation_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendation_cache
    ADD CONSTRAINT recommendation_cache_pkey PRIMARY KEY (id);


--
-- TOC entry 5224 (class 2606 OID 84150)
-- Name: recommendation_cache recommendation_cache_quiz_result_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendation_cache
    ADD CONSTRAINT recommendation_cache_quiz_result_id_product_id_key UNIQUE (quiz_result_id, product_id);


--
-- TOC entry 5108 (class 2606 OID 75902)
-- Name: skin_concerns skin_concerns_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skin_concerns
    ADD CONSTRAINT skin_concerns_name_key UNIQUE (name);


--
-- TOC entry 5110 (class 2606 OID 75900)
-- Name: skin_concerns skin_concerns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skin_concerns
    ADD CONSTRAINT skin_concerns_pkey PRIMARY KEY (id);


--
-- TOC entry 5104 (class 2606 OID 75892)
-- Name: skin_types skin_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skin_types
    ADD CONSTRAINT skin_types_name_key UNIQUE (name);


--
-- TOC entry 5106 (class 2606 OID 75890)
-- Name: skin_types skin_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skin_types
    ADD CONSTRAINT skin_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5191 (class 2606 OID 76162)
-- Name: user_favorites user_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (id);


--
-- TOC entry 5193 (class 2606 OID 76164)
-- Name: user_favorites user_favorites_session_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_session_id_product_id_key UNIQUE (session_id, product_id);


--
-- TOC entry 5195 (class 2606 OID 76166)
-- Name: user_favorites user_favorites_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- TOC entry 5187 (class 2606 OID 76140)
-- Name: user_ingredient_preferences user_ingredient_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ingredient_preferences
    ADD CONSTRAINT user_ingredient_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 5189 (class 2606 OID 76142)
-- Name: user_ingredient_preferences user_ingredient_preferences_user_profile_id_ingredient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ingredient_preferences
    ADD CONSTRAINT user_ingredient_preferences_user_profile_id_ingredient_id_key UNIQUE (user_profile_id, ingredient_id);


--
-- TOC entry 5174 (class 2606 OID 76075)
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5177 (class 2606 OID 76095)
-- Name: user_sensitivities user_sensitivities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sensitivities
    ADD CONSTRAINT user_sensitivities_pkey PRIMARY KEY (id);


--
-- TOC entry 5179 (class 2606 OID 76097)
-- Name: user_sensitivities user_sensitivities_user_profile_id_allergen_type_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sensitivities
    ADD CONSTRAINT user_sensitivities_user_profile_id_allergen_type_id_key UNIQUE (user_profile_id, allergen_type_id);


--
-- TOC entry 5219 (class 2606 OID 84110)
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5182 (class 2606 OID 76116)
-- Name: user_skin_concerns user_skin_concerns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skin_concerns
    ADD CONSTRAINT user_skin_concerns_pkey PRIMARY KEY (id);


--
-- TOC entry 5184 (class 2606 OID 76118)
-- Name: user_skin_concerns user_skin_concerns_user_profile_id_skin_concern_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skin_concerns
    ADD CONSTRAINT user_skin_concerns_user_profile_id_skin_concern_id_key UNIQUE (user_profile_id, skin_concern_id);


--
-- TOC entry 5167 (class 2606 OID 76064)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5169 (class 2606 OID 76062)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5081 (class 1259 OID 83962)
-- Name: idx_brands_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brands_name ON public.brands USING btree (name);


--
-- TOC entry 5082 (class 1259 OID 83961)
-- Name: idx_brands_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brands_search ON public.brands USING gin (to_tsvector('english'::regconfig, (name)::text));


--
-- TOC entry 5094 (class 1259 OID 76230)
-- Name: idx_formulation_traits_allergen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_formulation_traits_allergen ON public.formulation_traits USING btree (excludes_allergen_type_id);


--
-- TOC entry 5200 (class 1259 OID 76237)
-- Name: idx_guest_sessions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_sessions_session_id ON public.guest_sessions USING btree (session_id);


--
-- TOC entry 5211 (class 1259 OID 76331)
-- Name: idx_ingredient_benefits_map_ingredient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredient_benefits_map_ingredient ON public.ingredient_benefits_map USING btree (ingredient_id);


--
-- TOC entry 5206 (class 1259 OID 76330)
-- Name: idx_ingredient_functions_map_ingredient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredient_functions_map_ingredient ON public.ingredient_functions_map USING btree (ingredient_id);


--
-- TOC entry 5134 (class 1259 OID 76224)
-- Name: idx_ingredients_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredients_active ON public.ingredients USING btree (is_active);


--
-- TOC entry 5135 (class 1259 OID 83994)
-- Name: idx_ingredients_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredients_name ON public.ingredients USING btree (name);


--
-- TOC entry 5136 (class 1259 OID 83995)
-- Name: idx_ingredients_name_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredients_name_search ON public.ingredients USING gin (to_tsvector('english'::regconfig, (name)::text));


--
-- TOC entry 5083 (class 1259 OID 76229)
-- Name: idx_product_categories_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_categories_parent ON public.product_categories USING btree (parent_id);


--
-- TOC entry 5147 (class 1259 OID 76227)
-- Name: idx_product_ingredients_ingredient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_ingredients_ingredient ON public.product_ingredients USING btree (ingredient_id);


--
-- TOC entry 5148 (class 1259 OID 76228)
-- Name: idx_product_ingredients_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_ingredients_key ON public.product_ingredients USING btree (is_key_ingredient);


--
-- TOC entry 5149 (class 1259 OID 76226)
-- Name: idx_product_ingredients_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_ingredients_product ON public.product_ingredients USING btree (product_id);


--
-- TOC entry 5201 (class 1259 OID 76238)
-- Name: idx_product_match_scores_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_match_scores_profile ON public.product_match_scores USING btree (user_profile_id);


--
-- TOC entry 5117 (class 1259 OID 84046)
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_active ON public.products USING btree (is_active);


--
-- TOC entry 5118 (class 1259 OID 84063)
-- Name: idx_products_bpom_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_bpom_number ON public.products USING btree (bpom_number);


--
-- TOC entry 5119 (class 1259 OID 76211)
-- Name: idx_products_brand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_brand_id ON public.products USING btree (brand_id);


--
-- TOC entry 5120 (class 1259 OID 83972)
-- Name: idx_products_description_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_description_search ON public.products USING gin (to_tsvector('english'::regconfig, description));


--
-- TOC entry 5121 (class 1259 OID 84042)
-- Name: idx_products_main_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_main_category ON public.products USING btree (main_category);


--
-- TOC entry 5122 (class 1259 OID 84060)
-- Name: idx_products_main_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_main_category_id ON public.products USING btree (main_category_id);


--
-- TOC entry 5123 (class 1259 OID 84058)
-- Name: idx_products_main_category_string; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_main_category_string ON public.products USING btree (main_category);


--
-- TOC entry 5124 (class 1259 OID 83963)
-- Name: idx_products_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_name ON public.products USING btree (name);


--
-- TOC entry 5125 (class 1259 OID 83964)
-- Name: idx_products_name_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_name_search ON public.products USING gin (to_tsvector('english'::regconfig, (name)::text));


--
-- TOC entry 5126 (class 1259 OID 83971)
-- Name: idx_products_product_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_product_type ON public.products USING btree (product_type);


--
-- TOC entry 5127 (class 1259 OID 84062)
-- Name: idx_products_product_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_product_url ON public.products USING btree (product_url);


--
-- TOC entry 5128 (class 1259 OID 83973)
-- Name: idx_products_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_search ON public.products USING gin (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- TOC entry 5129 (class 1259 OID 84043)
-- Name: idx_products_subcategory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_subcategory ON public.products USING btree (subcategory);


--
-- TOC entry 5130 (class 1259 OID 84061)
-- Name: idx_products_subcategory_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_subcategory_id ON public.products USING btree (subcategory_id);


--
-- TOC entry 5131 (class 1259 OID 84059)
-- Name: idx_products_subcategory_string; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_subcategory_string ON public.products USING btree (subcategory);


--
-- TOC entry 5220 (class 1259 OID 84172)
-- Name: idx_recommendation_cache_quiz_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recommendation_cache_quiz_result ON public.recommendation_cache USING btree (quiz_result_id);


--
-- TOC entry 5185 (class 1259 OID 76236)
-- Name: idx_user_ingredient_preferences_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_ingredient_preferences_profile ON public.user_ingredient_preferences USING btree (user_profile_id);


--
-- TOC entry 5170 (class 1259 OID 76231)
-- Name: idx_user_profiles_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_session ON public.user_profiles USING btree (session_id);


--
-- TOC entry 5171 (class 1259 OID 76232)
-- Name: idx_user_profiles_skin_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_skin_type ON public.user_profiles USING btree (skin_type_id);


--
-- TOC entry 5172 (class 1259 OID 76233)
-- Name: idx_user_profiles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_user ON public.user_profiles USING btree (user_id);


--
-- TOC entry 5175 (class 1259 OID 76234)
-- Name: idx_user_sensitivities_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sensitivities_profile ON public.user_sensitivities USING btree (user_profile_id);


--
-- TOC entry 5180 (class 1259 OID 76235)
-- Name: idx_user_skin_concerns_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_skin_concerns_profile ON public.user_skin_concerns USING btree (user_profile_id);


--
-- TOC entry 5266 (class 2620 OID 76241)
-- Name: ingredients update_ingredients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5265 (class 2620 OID 76240)
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5268 (class 2620 OID 76242)
-- Name: user_profiles update_user_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5267 (class 2620 OID 76243)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5230 (class 2606 OID 75840)
-- Name: formulation_traits formulation_traits_excludes_allergen_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formulation_traits
    ADD CONSTRAINT formulation_traits_excludes_allergen_type_id_fkey FOREIGN KEY (excludes_allergen_type_id) REFERENCES public.allergen_types(id);


--
-- TOC entry 5253 (class 2606 OID 76184)
-- Name: guest_sessions guest_sessions_converted_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_sessions
    ADD CONSTRAINT guest_sessions_converted_to_user_id_fkey FOREIGN KEY (converted_to_user_id) REFERENCES public.users(id);


--
-- TOC entry 5258 (class 2606 OID 76294)
-- Name: ingredient_benefits_map ingredient_benefits_map_benefit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_benefits_map
    ADD CONSTRAINT ingredient_benefits_map_benefit_id_fkey FOREIGN KEY (benefit_id) REFERENCES public.ingredient_benefits(id);


--
-- TOC entry 5259 (class 2606 OID 76289)
-- Name: ingredient_benefits_map ingredient_benefits_map_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_benefits_map
    ADD CONSTRAINT ingredient_benefits_map_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;


--
-- TOC entry 5256 (class 2606 OID 76275)
-- Name: ingredient_functions_map ingredient_functions_map_function_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_functions_map
    ADD CONSTRAINT ingredient_functions_map_function_id_fkey FOREIGN KEY (function_id) REFERENCES public.ingredient_functions(id);


--
-- TOC entry 5257 (class 2606 OID 76270)
-- Name: ingredient_functions_map ingredient_functions_map_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_functions_map
    ADD CONSTRAINT ingredient_functions_map_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;


--
-- TOC entry 5260 (class 2606 OID 76307)
-- Name: ingredient_key_types ingredient_key_types_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_key_types
    ADD CONSTRAINT ingredient_key_types_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id);


--
-- TOC entry 5261 (class 2606 OID 76312)
-- Name: ingredient_key_types ingredient_key_types_key_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_key_types
    ADD CONSTRAINT ingredient_key_types_key_type_id_fkey FOREIGN KEY (key_type_id) REFERENCES public.key_ingredient_types(id);


--
-- TOC entry 5240 (class 2606 OID 76020)
-- Name: ingredient_relationships ingredient_relationships_ingredient1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_relationships
    ADD CONSTRAINT ingredient_relationships_ingredient1_id_fkey FOREIGN KEY (ingredient1_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;


--
-- TOC entry 5241 (class 2606 OID 76025)
-- Name: ingredient_relationships ingredient_relationships_ingredient2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_relationships
    ADD CONSTRAINT ingredient_relationships_ingredient2_id_fkey FOREIGN KEY (ingredient2_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;


--
-- TOC entry 5229 (class 2606 OID 75813)
-- Name: product_categories product_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.product_categories(id);


--
-- TOC entry 5242 (class 2606 OID 76040)
-- Name: product_formulation_traits product_formulation_traits_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_formulation_traits
    ADD CONSTRAINT product_formulation_traits_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5243 (class 2606 OID 76045)
-- Name: product_formulation_traits product_formulation_traits_trait_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_formulation_traits
    ADD CONSTRAINT product_formulation_traits_trait_id_fkey FOREIGN KEY (trait_id) REFERENCES public.formulation_traits(id);


--
-- TOC entry 5234 (class 2606 OID 83593)
-- Name: product_ingredients product_ingredients_ingredient_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_ingredients
    ADD CONSTRAINT product_ingredients_ingredient_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;


--
-- TOC entry 5235 (class 2606 OID 75987)
-- Name: product_ingredients product_ingredients_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_ingredients
    ADD CONSTRAINT product_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;


--
-- TOC entry 5236 (class 2606 OID 83588)
-- Name: product_ingredients product_ingredients_product_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_ingredients
    ADD CONSTRAINT product_ingredients_product_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5237 (class 2606 OID 75982)
-- Name: product_ingredients product_ingredients_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_ingredients
    ADD CONSTRAINT product_ingredients_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5238 (class 2606 OID 76002)
-- Name: product_key_ingredients product_key_ingredients_key_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_key_ingredients
    ADD CONSTRAINT product_key_ingredients_key_type_id_fkey FOREIGN KEY (key_type_id) REFERENCES public.key_ingredient_types(id);


--
-- TOC entry 5239 (class 2606 OID 75997)
-- Name: product_key_ingredients product_key_ingredients_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_key_ingredients
    ADD CONSTRAINT product_key_ingredients_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- TOC entry 5254 (class 2606 OID 76206)
-- Name: product_match_scores product_match_scores_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_match_scores
    ADD CONSTRAINT product_match_scores_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5255 (class 2606 OID 76201)
-- Name: product_match_scores product_match_scores_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_match_scores
    ADD CONSTRAINT product_match_scores_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- TOC entry 5231 (class 2606 OID 83966)
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5232 (class 2606 OID 84048)
-- Name: products products_main_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_main_category_id_fkey FOREIGN KEY (main_category_id) REFERENCES public.product_categories(id);


--
-- TOC entry 5233 (class 2606 OID 84053)
-- Name: products products_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.product_categories(id);


--
-- TOC entry 5263 (class 2606 OID 92238)
-- Name: quiz_results quiz_results_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_results
    ADD CONSTRAINT quiz_results_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.guest_sessions(session_id);


--
-- TOC entry 5264 (class 2606 OID 92243)
-- Name: quiz_results quiz_results_skin_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_results
    ADD CONSTRAINT quiz_results_skin_type_id_fkey FOREIGN KEY (skin_type_id) REFERENCES public.skin_types(id);


--
-- TOC entry 5262 (class 2606 OID 84156)
-- Name: recommendation_cache recommendation_cache_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendation_cache
    ADD CONSTRAINT recommendation_cache_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5252 (class 2606 OID 76167)
-- Name: user_favorites user_favorites_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5250 (class 2606 OID 76148)
-- Name: user_ingredient_preferences user_ingredient_preferences_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ingredient_preferences
    ADD CONSTRAINT user_ingredient_preferences_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id);


--
-- TOC entry 5251 (class 2606 OID 76143)
-- Name: user_ingredient_preferences user_ingredient_preferences_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ingredient_preferences
    ADD CONSTRAINT user_ingredient_preferences_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- TOC entry 5244 (class 2606 OID 76081)
-- Name: user_profiles user_profiles_skin_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_skin_type_id_fkey FOREIGN KEY (skin_type_id) REFERENCES public.skin_types(id);


--
-- TOC entry 5245 (class 2606 OID 76076)
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5246 (class 2606 OID 76103)
-- Name: user_sensitivities user_sensitivities_allergen_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sensitivities
    ADD CONSTRAINT user_sensitivities_allergen_type_id_fkey FOREIGN KEY (allergen_type_id) REFERENCES public.allergen_types(id);


--
-- TOC entry 5247 (class 2606 OID 76098)
-- Name: user_sensitivities user_sensitivities_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sensitivities
    ADD CONSTRAINT user_sensitivities_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- TOC entry 5248 (class 2606 OID 76124)
-- Name: user_skin_concerns user_skin_concerns_skin_concern_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skin_concerns
    ADD CONSTRAINT user_skin_concerns_skin_concern_id_fkey FOREIGN KEY (skin_concern_id) REFERENCES public.skin_concerns(id);


--
-- TOC entry 5249 (class 2606 OID 76119)
-- Name: user_skin_concerns user_skin_concerns_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skin_concerns
    ADD CONSTRAINT user_skin_concerns_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


-- Completed on 2025-07-30 08:42:18

--
-- PostgreSQL database dump complete
--

