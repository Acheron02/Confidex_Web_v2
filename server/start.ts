Object.assign(process.env, {
  NODE_ENV: "production",
});

void import("./index");
