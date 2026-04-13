import { MongoRepository } from "./mongoRepository";
import { CourseModel } from "../models/Course";
import type { Course } from "../types/course";

class CourseRepository extends MongoRepository<Course> {
  constructor() {
    super(CourseModel);
  }
}

export const courseRepo = new CourseRepository();
