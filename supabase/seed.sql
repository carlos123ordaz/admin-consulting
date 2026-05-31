-- Seed data — Herrera Consulting
-- Run after schema.sql

insert into team_members (id, name, initials, role, color, email, load_pct) values
  ('mh','Mariana Herrera','MH','CEO / Fundadora','#2A6FDB','mariana@herrera.dev',72),
  ('co','Carlos Ordaz','CO','Director de Proyectos','#6d4bd6','carlos@herrera.dev',88),
  ('ds','Diego Salas','DS','Desarrollador Senior','#0d8a8a','diego@herrera.dev',94),
  ('lf','Lucía Fuentes','LF','Diseñadora UX/UI','#d2453d','lucia@herrera.dev',65),
  ('ap','Andrés Pineda','AP','Desarrollador Backend','#c2790b','andres@herrera.dev',81),
  ('vc','Valeria Cruz','VC','QA / Testing','#1f8a5b','valeria@herrera.dev',58),
  ('tr','Tomás Rivas','TR','DevOps','#3457a8','tomas@herrera.dev',70),
  ('sm','Sofía Mendoza','SM','Project Manager','#a8347a','sofia@herrera.dev',76)
on conflict do nothing;

insert into clients (id, name, sector, color, logo, since, contact, status, billed) values
  ('aurora','Banco Aurora','Fintech / Banca','#2A6FDB','BA','2023','Ricardo Vélez','Activo',248000),
  ('retailmax','RetailMax','E-commerce','#d2453d','RM','2024','Paula Domínguez','Activo',96500),
  ('vida','Clínica Vida','Salud / HealthTech','#1f8a5b','CV','2024','Dr. Hugo Marín','Activo',72400),
  ('logitrack','LogiTrack','Logística','#c2790b','LT','2025','Esteban Ríos','Activo',18800),
  ('eduplus','EduPlus','EdTech','#6d4bd6','EP','2024','Renata Salgado','Activo',134000),
  ('solaris','Grupo Solaris','Energía','#0d8a8a','GS','2023','Marcos Téllez','Inactivo',187300)
on conflict do nothing;

insert into projects (id, code, name, client_id, color, status, progress, lead_id, budget, spent, start_date, due_date) values
  ('p1','BAU','Plataforma Banca Digital','aurora','#2A6FDB','En progreso',64,'co',320000,205000,'2026-01-08','2026-08-20'),
  ('p2','RMX','Rediseño E-commerce','retailmax','#d2453d','En progreso',38,'sm',145000,51000,'2026-03-02','2026-09-15'),
  ('p3','CVA','App de Citas Médicas','vida','#1f8a5b','En revisión',82,'co',98000,84000,'2025-11-10','2026-06-30'),
  ('p4','LGT','Sistema de Rastreo en Tiempo Real','logitrack','#c2790b','Planificación',12,'tr',76000,9000,'2026-05-12','2026-11-30'),
  ('p5','EDU','Portal Estudiantil','eduplus','#6d4bd6','En progreso',55,'sm',168000,92000,'2026-02-01','2026-10-10'),
  ('p6','SOL','Dashboard de Energía','solaris','#0d8a8a','Completado',100,'mh',187000,187300,'2025-09-01','2026-04-15')
on conflict do nothing;

insert into project_members (project_id, member_id) values
  ('p1','co'),('p1','ds'),('p1','ap'),('p1','tr'),('p1','vc'),
  ('p2','lf'),('p2','ds'),('p2','sm'),
  ('p3','ap'),('p3','lf'),('p3','vc'),('p3','co'),
  ('p4','tr'),('p4','ds'),
  ('p5','ds'),('p5','ap'),('p5','lf'),('p5','sm'),('p5','vc'),
  ('p6','ds'),('p6','tr'),('p6','mh')
on conflict do nothing;

insert into sprints (id, name, status, start_date, end_date, goal) values
  ('sprint-24','Sprint 24','Activo','2026-05-19','2026-06-01','Completar integraciones de pagos y flujo de onboarding bancario'),
  ('sprint-23','Sprint 23','Completado','2026-05-05','2026-05-18','Auditoría de seguridad y pipeline CI/CD completados')
on conflict do nothing;

insert into tasks (id, title, project_id, assignee_id, sprint_id, priority, col, due_date, points, description, labels) values
  ('BAU-128','Integrar pasarela de pagos con tokenización','p1','ap','sprint-24','Urgente','progress','2026-06-04',8,'Implementar la integración con el proveedor de pagos usando tokenización PCI-DSS. Debe soportar pagos recurrentes y reembolsos parciales.',ARRAY['Backend','API']),
  ('BAU-131','Diseñar flujo de onboarding biométrico','p1','lf','sprint-24','Alta','todo','2026-06-12',5,'Diseñar el flujo de alta de usuario con verificación biométrica (rostro + documento). Considerar accesibilidad y casos de error.',ARRAY['Diseño','UX']),
  ('BAU-119','Auditoría de seguridad del módulo de transferencias','p1','tr','sprint-23','Alta','review','2026-06-02',13,'Ejecutar auditoría de seguridad sobre el módulo de transferencias interbancarias antes del despliegue a producción.',ARRAY['Seguridad']),
  ('BAU-104','Configurar pipeline CI/CD en Kubernetes','p1','tr','sprint-23','Media','done','2026-05-22',8,'Pipeline completo de integración y despliegue continuo con entornos de staging y producción.',ARRAY['DevOps']),
  ('RMX-67','Como usuario quiero filtrar productos por talla y color','p2','ds','sprint-24','Media','progress','2026-06-09',5,'Añadir filtros facetados de talla, color y rango de precio al catálogo, con actualización sin recargar la página.',ARRAY['Frontend']),
  ('RMX-71','Rediseñar la página de detalle de producto','p2','lf','sprint-24','Alta','todo','2026-06-18',8,'Nueva página de producto con galería, reseñas, productos relacionados y CTA de compra fija en móvil.',ARRAY['Diseño']),
  ('RMX-58','Migrar carrito a almacenamiento persistente','p2','ds',null,'Media','todo','2026-06-25',5,'El carrito debe persistir entre sesiones y dispositivos para usuarios autenticados.',ARRAY['Frontend','Backend']),
  ('CVA-203','Recordatorios push de citas médicas','p3','ap','sprint-24','Alta','review','2026-06-01',5,'Sistema de recordatorios push 24h y 1h antes de cada cita, con opción de reagendar desde la notificación.',ARRAY['Backend','Notificaciones']),
  ('CVA-198','Pruebas de accesibilidad WCAG AA','p3','vc','sprint-24','Media','progress','2026-06-07',8,'Auditar toda la app contra WCAG 2.1 nivel AA y documentar incidencias por pantalla.',ARRAY['QA']),
  ('CVA-176','Historial clínico exportable a PDF','p3','ap','sprint-23','Baja','done','2026-05-28',5,'Permitir al paciente descargar su historial clínico completo en PDF firmado digitalmente.',ARRAY['Backend']),
  ('LGT-12','Definir arquitectura de ingesta GPS','p4','tr',null,'Urgente','todo','2026-06-10',13,'Diseñar la arquitectura para ingerir 50k eventos GPS por minuto con baja latencia y tolerancia a fallos.',ARRAY['Arquitectura','DevOps']),
  ('LGT-08','Mapa en vivo de la flota','p4','ds',null,'Alta','todo','2026-06-20',8,'Vista de mapa en tiempo real con la posición de cada vehículo, clustering y filtros por estado.',ARRAY['Frontend']),
  ('EDU-145','Sistema de calificaciones y boletas','p5','ds','sprint-24','Alta','progress','2026-06-14',13,'Módulo para que docentes capturen calificaciones y se generen boletas automáticas por periodo.',ARRAY['Backend','Frontend']),
  ('EDU-150','Foro de discusión por materia','p5','lf','sprint-24','Media','review','2026-06-05',8,'Foro tipo hilo por cada materia, con menciones, adjuntos y moderación docente.',ARRAY['Diseño','Frontend']),
  ('EDU-138','Integración con Google Classroom','p5','ap','sprint-24','Media','todo','2026-06-22',8,'Sincronizar cursos, tareas y estudiantes con Google Classroom vía API.',ARRAY['API','Integraciones']),
  ('EDU-129','Dashboard de progreso del estudiante','p5','sm','sprint-23','Baja','done','2026-05-30',5,'Panel con métricas de avance, asistencia y calificaciones para el estudiante y su tutor.',ARRAY['Frontend'])
on conflict do nothing;

insert into subtasks (task_id, title, done, position) values
  ('BAU-128','Configurar SDK del proveedor',true,0),
  ('BAU-128','Endpoint de tokenización',true,1),
  ('BAU-128','Manejo de webhooks de confirmación',false,2),
  ('BAU-128','Pruebas en sandbox',false,3),
  ('BAU-131','Wireframes de los 5 pasos',false,0),
  ('BAU-131','Estados de error y reintento',false,1),
  ('BAU-131','Prototipo en alta fidelidad',false,2),
  ('BAU-119','Análisis estático de código',true,0),
  ('BAU-119','Pruebas de penetración',true,1),
  ('BAU-119','Reporte de hallazgos',false,2),
  ('BAU-104','Manifiestos de Helm',true,0),
  ('BAU-104','Despliegue azul-verde',true,1),
  ('BAU-104','Rollback automático',true,2),
  ('RMX-67','Componente de filtros',true,0),
  ('RMX-67','Sincronizar con URL',false,1),
  ('RMX-67','Resultados sin recarga',false,2),
  ('RMX-71','Galería con zoom',false,0),
  ('RMX-71','Sección de reseñas',false,1),
  ('RMX-71','CTA fija en móvil',false,2),
  ('RMX-58','Modelo de datos',false,0),
  ('RMX-58','Sincronización en login',false,1),
  ('CVA-203','Programador de tareas',true,0),
  ('CVA-203','Plantillas de notificación',true,1),
  ('CVA-203','Reagendar desde push',false,2),
  ('CVA-198','Contraste de color',true,0),
  ('CVA-198','Navegación por teclado',false,1),
  ('CVA-198','Lectores de pantalla',false,2),
  ('CVA-176','Plantilla de PDF',true,0),
  ('CVA-176','Firma digital',true,1),
  ('LGT-12','Evaluar Kafka vs Pulsar',false,0),
  ('LGT-12','Esquema de particionado',false,1),
  ('LGT-12','Diagrama de arquitectura',false,2),
  ('LGT-08','Integrar librería de mapas',false,0),
  ('LGT-08','Clustering de marcadores',false,1),
  ('EDU-145','Modelo de calificaciones',true,0),
  ('EDU-145','Captura por docente',false,1),
  ('EDU-145','Generación de boletas',false,2),
  ('EDU-150','Diseño de hilos',true,0),
  ('EDU-150','Menciones @',true,1),
  ('EDU-150','Moderación',false,2),
  ('EDU-138','OAuth con Google',false,0),
  ('EDU-138','Sincronizar cursos',false,1),
  ('EDU-129','Gráficos de avance',true,0),
  ('EDU-129','Vista de tutor',true,1)
on conflict do nothing;

insert into invoices (id, client_id, project_id, amount, status, issued_date, due_date, concept) values
  ('FAC-0047','solaris','p6',54300,'Pagada','2026-04-18','2026-05-18','Entrega final · Dashboard de Energía'),
  ('FAC-0046','eduplus','p5',31000,'Pendiente','2026-05-10','2026-06-09','Hito 3 · Portal Estudiantil'),
  ('FAC-0045','logitrack','p4',9200,'Vencida','2026-04-02','2026-05-02','Anticipo · Sistema de Rastreo'),
  ('FAC-0044','vida','p3',15800,'Pagada','2026-05-05','2026-06-04','Hito 4 · App de Citas Médicas'),
  ('FAC-0043','retailmax','p2',22500,'Pendiente','2026-05-20','2026-06-19','Hito 2 · Rediseño E-commerce'),
  ('FAC-0042','aurora','p1',48000,'Pagada','2026-04-28','2026-05-28','Hito 5 · Plataforma Banca Digital'),
  ('FAC-0041','aurora','p1',48000,'Pagada','2026-03-28','2026-04-28','Hito 4 · Plataforma Banca Digital'),
  ('FAC-0040','eduplus','p5',28000,'Pagada','2026-03-12','2026-04-11','Hito 2 · Portal Estudiantil')
on conflict do nothing;

insert into activity_log (member_id, action, target, created_at) values
  ('ds','movió','CVA-176 a Completado', now() - interval '12 minutes'),
  ('lf','comentó en','RMX-71', now() - interval '38 minutes'),
  ('co','creó la tarea','BAU-131', now() - interval '1 hour'),
  ('ap','cerró','CVA-203 para revisión', now() - interval '2 hours'),
  ('tr','completó la auditoría de','BAU-119', now() - interval '3 hours'),
  ('sm','actualizó el avance de','Portal Estudiantil a 55%', now() - interval '5 hours'),
  ('mh','aprobó la factura','FAC-0047', now() - interval '1 day')
on conflict do nothing;

insert into monthly_revenue (month, billed, collected) values
  ('2025-12',142000,138000),
  ('2026-01',168000,155000),
  ('2026-02',154000,154000),
  ('2026-03',196000,172000),
  ('2026-04',178000,165000),
  ('2026-05',211000,96000)
on conflict do nothing;
