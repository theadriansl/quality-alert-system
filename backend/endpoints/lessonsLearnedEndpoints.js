const { query } = require('../config/database');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');

// GET /lessons-learned - Get all lessons learned with 8D report data
async function getAllLessonsLearned(req, res) {
  try {
    const result = await query(`
      SELECT
        ll.id,
        ll.report_id,
        ll.lesson_text,
        ll.category,
        ll.created_by,
        ll.created_at,
        ll.updated_at,
        r.title AS report_title,
        r.severity,
        r.issue_date,
        r.supplier_name AS client_name,
        r.part_number,
        r.part_name,
        r.status AS report_status,
        r.created_at AS report_created_at,
        creator.first_name || ' ' || creator.last_name AS created_by_name,
        EXTRACT(DAY FROM CURRENT_TIMESTAMP - r.issue_date) AS days_since_issue
      FROM lessons_learned ll
      LEFT JOIN eightd_reports r ON ll.report_id = r.report_id
      LEFT JOIN users creator ON ll.created_by = creator.id
      ORDER BY ll.created_at DESC
    `);

    const lessons = result.rows.map(row => transformToCamelCase(row));

    res.json({
      success: true,
      lessons: lessons,
      count: lessons.length
    });
  } catch (error) {
    console.error('Error fetching lessons learned:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lessons learned',
      error: error.message
    });
  }
}

// GET /lessons-learned/report/:reportId - Get lessons learned for a specific 8D report
async function getLessonsLearnedByReport(req, res) {
  try {
    const { reportId } = req.params;

    const result = await query(`
      SELECT
        ll.id,
        ll.report_id,
        ll.lesson_text,
        ll.category,
        ll.created_by,
        ll.created_at,
        ll.updated_at,
        creator.first_name || ' ' || creator.last_name AS created_by_name
      FROM lessons_learned ll
      LEFT JOIN users creator ON ll.created_by = creator.id
      WHERE ll.report_id = $1
      ORDER BY ll.created_at DESC
    `, [reportId]);

    const lessons = result.rows.map(row => transformToCamelCase(row));

    res.json({
      success: true,
      lessons: lessons,
      count: lessons.length
    });
  } catch (error) {
    console.error('Error fetching lessons learned for report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lessons learned for report',
      error: error.message
    });
  }
}

// POST /lessons-learned - Create a new lesson learned
async function createLessonLearned(req, res) {
  try {
    const { reportId, lessonText, category } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!reportId || !lessonText) {
      return res.status(400).json({
        success: false,
        message: 'Report ID and lesson text are required'
      });
    }

    // Verify report exists
    const reportCheck = await query(
      'SELECT report_id FROM eightd_reports WHERE report_id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Report ${reportId} not found`
      });
    }

    const result = await query(`
      INSERT INTO lessons_learned (report_id, lesson_text, category, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, report_id, lesson_text, category, created_by, created_at, updated_at
    `, [reportId, lessonText, category || null, userId]);

    const lesson = transformToCamelCase(result.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Lesson learned created successfully',
      lesson: lesson
    });
  } catch (error) {
    console.error('Error creating lesson learned:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating lesson learned',
      error: error.message
    });
  }
}

// PUT /lessons-learned/:id - Update a lesson learned
async function updateLessonLearned(req, res) {
  try {
    const lessonId = parseInt(req.params.id);
    const { lessonText, category } = req.body;

    if (!lessonText) {
      return res.status(400).json({
        success: false,
        message: 'Lesson text is required'
      });
    }

    const result = await query(`
      UPDATE lessons_learned
      SET lesson_text = $1, category = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, report_id, lesson_text, category, created_by, created_at, updated_at
    `, [lessonText, category || null, lessonId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lesson learned not found'
      });
    }

    const lesson = transformToCamelCase(result.rows[0]);

    res.json({
      success: true,
      message: 'Lesson learned updated successfully',
      lesson: lesson
    });
  } catch (error) {
    console.error('Error updating lesson learned:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating lesson learned',
      error: error.message
    });
  }
}

// DELETE /lessons-learned/:id - Delete a lesson learned
async function deleteLessonLearned(req, res) {
  try {
    const lessonId = parseInt(req.params.id);

    const result = await query(
      'DELETE FROM lessons_learned WHERE id = $1 RETURNING id, report_id',
      [lessonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lesson learned not found'
      });
    }

    res.json({
      success: true,
      message: 'Lesson learned deleted successfully',
      deletedId: lessonId
    });
  } catch (error) {
    console.error('Error deleting lesson learned:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting lesson learned',
      error: error.message
    });
  }
}

module.exports = {
  getAllLessonsLearned,
  getLessonsLearnedByReport,
  createLessonLearned,
  updateLessonLearned,
  deleteLessonLearned
};
