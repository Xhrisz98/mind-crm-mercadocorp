--
-- PostgreSQL database dump
--

\restrict HYE3PZp1eeMc7NvZzhtQmqaPbDXREi1pyN3xc2RQoXFYV9RrVRciBa8FVqwX1ga

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
-- Data for Name: campanas_metricas; Type: TABLE DATA; Schema: public; Owner: mercadocorp_user
--

COPY public.campanas_metricas (id, campana_id, fecha, impresiones, clics, conversiones, gasto, registrado_por, fecha_registro) FROM stdin;
1	2	2026-08-04	2044	59	4	33.20	1	2026-08-04 17:33:27.361349+00
2	2	2026-08-03	2980	36	9	36.51	1	2026-08-04 17:33:27.361349+00
3	2	2026-08-02	2669	28	5	26.83	1	2026-08-04 17:33:27.361349+00
4	2	2026-08-01	2796	27	5	22.85	1	2026-08-04 17:33:27.361349+00
5	2	2026-07-31	1377	45	2	20.64	1	2026-08-04 17:33:27.361349+00
6	2	2026-07-30	2185	99	4	29.90	1	2026-08-04 17:33:27.361349+00
7	2	2026-07-29	1328	21	6	40.78	1	2026-08-04 17:33:27.361349+00
8	2	2026-07-28	2495	70	5	32.24	1	2026-08-04 17:33:27.361349+00
9	2	2026-07-27	1181	53	9	40.91	1	2026-08-04 17:33:27.361349+00
10	2	2026-07-26	2842	63	4	43.78	1	2026-08-04 17:33:27.361349+00
\.


--
-- Name: campanas_metricas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: mercadocorp_user
--

SELECT pg_catalog.setval('public.campanas_metricas_id_seq', 10, true);


--
-- PostgreSQL database dump complete
--

\unrestrict HYE3PZp1eeMc7NvZzhtQmqaPbDXREi1pyN3xc2RQoXFYV9RrVRciBa8FVqwX1ga

