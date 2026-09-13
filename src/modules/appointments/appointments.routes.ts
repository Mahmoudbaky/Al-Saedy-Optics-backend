import { z } from "zod";
import { created, reply } from "../../lib/http.js";
import { createModuleRouter } from "../../lib/router.js";
import { boolQuery, idParamSchema } from "../../lib/schemas.js";
import { strictRateLimit } from "../../middleware/rate-limit.js";
import {
  adminListAppointmentsQuerySchema,
  appointmentResponseSchema,
  availabilityQuerySchema,
  availabilityResponseSchema,
  bookAppointmentSchema,
  createDoctorSchema,
  doctorResponseSchema,
  rescheduleSchema,
  updateAppointmentStatusSchema,
  updateDoctorSchema,
} from "./appointments.schema.js";
import { appointmentsService } from "./appointments.service.js";

// ---- public ------------------------------------------------------------------
const pub = createModuleRouter({ prefix: "/api/v1/clinic", tags: ["Clinic · Eye exams"] });

pub.route({
  method: "get",
  path: "/doctors",
  summary: "Doctors available for eye exams",
  response: z.array(doctorResponseSchema),
  handler: () => appointmentsService.listDoctors(false),
});
pub.route({
  method: "get",
  path: "/availability",
  summary: "Bookable days and time slots",
  query: availabilityQuerySchema,
  response: availabilityResponseSchema,
  handler: ({ query }) => appointmentsService.availability(query),
});

// ---- me ----------------------------------------------------------------------
const me = createModuleRouter({ prefix: "/api/v1/me/appointments", tags: ["Me · Appointments"], auth: "user" });

me.route({
  method: "get",
  path: "/",
  summary: "My appointments",
  response: z.array(appointmentResponseSchema),
  handler: ({ user }) => appointmentsService.listMine(user.id),
});
me.route({
  method: "post",
  path: "/",
  summary: "Book an eye exam",
  middleware: [strictRateLimit],
  body: bookAppointmentSchema,
  response: appointmentResponseSchema,
  status: 201,
  handler: async ({ user, body }) => created(await appointmentsService.book(user.id, body, user.locale ?? null)),
});
me.route({
  method: "post",
  path: "/:id/reschedule",
  summary: "Move my appointment to another slot",
  params: idParamSchema,
  body: rescheduleSchema,
  response: appointmentResponseSchema,
  status: 200,
  handler: ({ user, params, body }) => appointmentsService.reschedule(user.id, params.id, body.scheduledAt),
});
me.route({
  method: "post",
  path: "/:id/cancel",
  summary: "Cancel my appointment",
  params: idParamSchema,
  response: appointmentResponseSchema,
  status: 200,
  handler: ({ user, params }) => appointmentsService.cancelMine(user.id, params.id),
});

// ---- admin --------------------------------------------------------------------
const admin = createModuleRouter({ prefix: "/api/v1/admin/appointments", tags: ["Admin · Appointments"], auth: "admin" });

admin.route({
  method: "get",
  path: "/",
  summary: "Clinic schedule",
  query: adminListAppointmentsQuerySchema,
  response: z.array(appointmentResponseSchema),
  handler: async ({ query }) => {
    const { items, meta } = await appointmentsService.adminList(query);
    return reply(items, { meta });
  },
});
admin.route({
  method: "post",
  path: "/:id/status",
  summary: "Confirm / complete / cancel / mark no-show",
  params: idParamSchema,
  body: updateAppointmentStatusSchema,
  response: appointmentResponseSchema,
  status: 200,
  handler: ({ params, body }) => appointmentsService.updateStatus(params.id, body.status, body.notes),
});

const adminDoctors = createModuleRouter({ prefix: "/api/v1/admin/doctors", tags: ["Admin · Doctors"], auth: "admin" });

adminDoctors.route({
  method: "get",
  path: "/",
  summary: "List doctors",
  query: z.object({ includeInactive: boolQuery }),
  response: z.array(doctorResponseSchema),
  handler: ({ query }) => appointmentsService.listDoctors(query.includeInactive ?? true),
});
adminDoctors.route({
  method: "post",
  path: "/",
  summary: "Add a doctor",
  body: createDoctorSchema,
  response: doctorResponseSchema,
  status: 201,
  handler: async ({ body }) => created(await appointmentsService.createDoctor(body)),
});
adminDoctors.route({
  method: "patch",
  path: "/:id",
  summary: "Update a doctor",
  params: idParamSchema,
  body: updateDoctorSchema,
  response: doctorResponseSchema,
  handler: ({ params, body }) => appointmentsService.updateDoctor(params.id, body),
});

export const clinicRouter = pub.router;
export const appointmentsRouter = me.router;
export const adminAppointmentsRouter = admin.router;
export const adminDoctorsRouter = adminDoctors.router;
