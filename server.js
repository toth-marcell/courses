import express from "express";
import dotenv from "dotenv";
import JWT from "jsonwebtoken";
import { Admin, Course, Teacher } from "./models.js";
import bcrypt from "bcryptjs";
import swaggerUiExpress from "swagger-ui-express";

dotenv.config({ quiet: true });

const app = express();
app.use(express.static("public"));
app.use(
  "/docs",
  swaggerUiExpress.serve,
  swaggerUiExpress.setup(null, { swaggerOptions: { url: "/openapi.yaml" } }),
);
app.use(async (req, res, next) => {
  try {
    const token = req.headers.authorization.replace(/^Bearer: /, "");
    res.locals.user = await Admin.findByPk(
      JWT.verify(token, process.env.SECRET).id,
    );
  } catch {
    res.locals.user = null;
  }
  next();
});
app.use(express.json());

function LoggedInOnly(req, res, next) {
  if (res.locals.user == null)
    res.status(401).json({ msg: "You can only do this while logged in." });
  else next();
}

app.post("/register", async (req, res) => {
  const { username, password, fullName, email } = req.body ?? {};
  if (!(username && password && fullName && email))
    return res.status(400).json({ msg: "Missing attrs!" });
  const existingUser = await Admin.findOne({ where: { username } });
  if (existingUser)
    return res.status(400).json({ msg: "Username already taken!" });
  await Admin.create({
    username,
    password: bcrypt.hashSync(password),
    fullName,
    email,
  });
  res.json({ msg: "Success!" });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!(username && password))
    return res.status(400).json({ msg: "Missing attrs!" });
  const existingUser = await Admin.findOne({ where: { username } });
  if (!existingUser) return res.status(404).json({ msg: "No such user!" });
  if (bcrypt.compareSync(password, existingUser.password))
    return res.json({
      msg: "Success!",
      token: JWT.sign({ id: existingUser.id }, process.env.SECRET),
    });
  res.status(400).json({ msg: "Wrong password!" });
});

app.put("/profile", LoggedInOnly, async (req, res) => {
  const { username, fullName, email } = req.body ?? {};
  if (!(username || fullName || email))
    return res.status(400).json({ msg: "Not changing anything!" });
  if (username) await res.locals.user.update({ username });
  if (fullName) await res.locals.user.update({ fullName });
  if (email) await res.locals.user.update({ email });
  res.json({ msg: "Success!" });
});

app.patch("/profile", LoggedInOnly, async (req, res) => {
  const { password } = req.body ?? {};
  if (!password) res.status(400).json({ msg: "Must specify new password!" });
  await res.locals.user.update({ password: bcrypt.hashSync(password) });
  res.json({ msg: "Success!" });
});

app.get("/teachers", async (req, res) => res.json(await Teacher.findAll()));

app.post("/teachers", LoggedInOnly, async (req, res) => {
  const { fullName, qualifications, email, phone } = req.body ?? {};
  if (!(fullName && qualifications && email && phone))
    return res.status(400).json({ msg: "Missing attrs!" });
  await Teacher.create({ fullName, qualifications, email, phone });
  res.json({ msg: "Success!" });
});

app.put("/teachers/:id", LoggedInOnly, async (req, res) => {
  const { fullName, qualifications, email, phone } = req.body ?? {};
  if (!(fullName || qualifications || email || phone))
    return res.status(400).json({ msg: "Not changing anything!" });
  const teacher = await Teacher.findByPk(req.params.id);
  if (!teacher) return res.status(404).json({ msg: "No such teacher!" });
  if (fullName) await teacher.update({ fullName });
  if (qualifications) await teacher.update({ qualifications });
  if (email) await teacher.update({ email });
  if (phone) await teacher.update({ phone });
  res.json({ msg: "Success!" });
});

app.delete("/teachers:id", LoggedInOnly, async (req, res) => {
  const teacher = await Teacher.findByPk(req.params.id);
  if (!teacher) return res.status(404).json({ msg: "No such teacher!" });
  await teacher.destroy();
  res.json({ msg: "Success!" });
});

app.get("/courses", async (req, res) =>
  res.json(await Course.findAll({ include: Teacher })),
);

app.post("/courses", LoggedInOnly, async (req, res) => {
  const { name, description, location, price, TeacherId } = req.body ?? {};
  if (!(name && description && location && price && TeacherId))
    return res.status(400).json({ msg: "Missing attrs!" });
  await Course.create({ name, description, location, price, TeacherId });
  res.json({ msg: "Success!" });
});

app.put("/courses/:id", LoggedInOnly, async (req, res) => {
  const { name, description, location, price, TeacherId } = req.body ?? {};
  if (!(name || description || location || price || TeacherId))
    return res.status(400).json({ msg: "Not changing anything!" });
  const course = await Course.findByPk(req.params.id);
  if (!course) return res.status(404).json({ msg: "No such course!" });
  if (name) await course.update({ name });
  if (description) await course.update({ description });
  if (location) await course.update({ location });
  if (price) await course.update({ price });
  if (TeacherId) await course.update({ TeacherId });
  res.json({ msg: "Success!" });
});

app.delete("/courses:id", LoggedInOnly, async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  if (!course) return res.status(404).json({ msg: "No such course!" });
  await course.destroy();
  res.json({ msg: "Success!" });
});

const port = process.env.PORT;
app.listen(port, () => console.log(`Listening: http://localhost:${port}`));
