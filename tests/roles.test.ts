import test from "node:test";
import assert from "node:assert/strict";
import { getHighestStudioRole, normalizePlatformRole, normalizeStudioRole, hasMinStudioRole, isPrivilegedStudioRole } from "../shared/roles.ts";

test("normalizePlatformRole handles aliases", () => {
  assert.equal(normalizePlatformRole("platformowner"), "platform_owner");
  assert.equal(normalizePlatformRole("platform_owner"), "platform_owner");
  assert.equal(normalizePlatformRole("studio_admin"), "studio_admin");
  assert.equal(normalizePlatformRole("studioadmin"), "studio_admin");
  assert.equal(normalizePlatformRole("director"), "diretor");
  assert.equal(normalizePlatformRole("voice_actor"), "dublador");
  assert.equal(normalizePlatformRole("aluno"), "dublador");
});

test("hasMinStudioRole places studio_admin between diretor and platform_owner", () => {
  assert.equal(hasMinStudioRole("studio_admin", "diretor"), true);
  assert.equal(hasMinStudioRole("diretor", "studio_admin"), false);
  assert.equal(hasMinStudioRole("platform_owner", "studio_admin"), true);
});

test("normalizeStudioRole handles aliases", () => {
  assert.equal(normalizeStudioRole("director"), "diretor");
  assert.equal(normalizeStudioRole("teacher"), "diretor");
  assert.equal(normalizeStudioRole("voice_actor"), "dublador");
  assert.equal(normalizeStudioRole("aluno"), "dublador");
  assert.equal(normalizeStudioRole(undefined), "dublador");
});

test("getHighestStudioRole returns the most privileged role", () => {
  assert.equal(getHighestStudioRole(["dublador", "diretor"]), "diretor");
  assert.equal(getHighestStudioRole(["dublador"]), "dublador");
  assert.equal(getHighestStudioRole(["platform_owner", "diretor"]), "platform_owner");
});

test("hasMinStudioRole enforces hierarchy", () => {
  assert.equal(hasMinStudioRole("diretor", "dublador"), true);
  assert.equal(hasMinStudioRole("dublador", "diretor"), false);
  assert.equal(hasMinStudioRole("platform_owner", "diretor"), true);
});

test("isPrivilegedStudioRole matches privileged roles", () => {
  assert.equal(isPrivilegedStudioRole("dublador"), false);
  assert.equal(isPrivilegedStudioRole("diretor"), true);
  assert.equal(isPrivilegedStudioRole("platform_owner"), true);
});
