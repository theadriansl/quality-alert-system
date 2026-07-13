const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// MULTER - FOTOS DE USUARIO
// ============================================================================

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/photos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user-${req.params.userId}-${Date.now()}${ext}`);
  }
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// ============================================================================
// MULTER - EVIDENCIAS DE CAPACITACIÓN
// ============================================================================

const evidenceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/evidence');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `evidence-${Date.now()}-${safeFilename}`);
  }
});

const evidenceUpload = multer({
  storage: evidenceStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB max
});

// ============================================================================
// ESCALAS
// ============================================================================

// GET /skills/scales - Listar escalas
router.get('/scales', authenticateToken, async (req, res) => {
  try {
    const scales = await query(`
      SELECT s.*,
        json_agg(json_build_object(
          'levelValue', sl.level_value,
          'code', sl.code,
          'label', sl.label,
          'description', sl.description,
          'color', sl.color
        ) ORDER BY sl.level_value) as levels
      FROM skill_scales s
      LEFT JOIN skill_scale_levels sl ON s.id = sl.scale_id
      WHERE s.is_active = TRUE
      GROUP BY s.id
      ORDER BY s.is_default DESC, s.name
    `);
    res.json({ success: true, data: transformToCamelCase(scales.rows) });
  } catch (error) {
    console.error('Error fetching scales:', error);
    res.status(500).json({ success: false, message: 'Error fetching scales' });
  }
});

// POST /skills/scales - Crear escala
router.post('/scales', authenticateToken, async (req, res) => {
  const { name, code, description, minValue = 1, maxValue = 5, levels } = req.body;

  try {
    const result = await query(`
      INSERT INTO skill_scales (name, code, description, min_value, max_value)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [name, code, description, minValue, maxValue]);

    const scaleId = result.rows[0].id;

    if (levels && levels.length > 0) {
      for (const level of levels) {
        await query(`
          INSERT INTO skill_scale_levels (scale_id, level_value, code, label, description, color)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [scaleId, level.levelValue, level.code, level.label, level.description, level.color]);
      }
    }

    res.json({ success: true, data: { id: scaleId } });
  } catch (error) {
    console.error('Error creating scale:', error);
    res.status(500).json({ success: false, message: 'Error creating scale' });
  }
});

// ============================================================================
// CATEGORÍAS
// ============================================================================

// GET /skills/categories - Listar categorías
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, s.name as scale_name,
        (SELECT COUNT(*) FROM skill_definitions WHERE category_id = c.id AND is_active = TRUE) as skill_count
      FROM skill_categories c
      LEFT JOIN skill_scales s ON c.scale_id = s.id
      WHERE c.is_active = TRUE
      ORDER BY c.display_order, c.name
    `);
    res.json({ success: true, data: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Error fetching categories' });
  }
});

// POST /skills/categories - Crear categoría
router.post('/categories', authenticateToken, async (req, res) => {
  const { name, code, description, icon, color, scaleId, displayOrder } = req.body;

  try {
    const result = await query(`
      INSERT INTO skill_categories (name, code, description, icon, color, scale_id, display_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, code, description, icon || '📋', color || '#3b82f6', scaleId, displayOrder || 0]);

    res.json({ success: true, data: transformToCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'Error creating category' });
  }
});

// PUT /skills/categories/:id - Actualizar categoría
router.put('/categories/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, description, icon, color, scaleId, displayOrder } = req.body;

  try {
    const result = await query(`
      UPDATE skill_categories
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          icon = COALESCE($3, icon),
          color = COALESCE($4, color),
          scale_id = COALESCE($5, scale_id),
          display_order = COALESCE($6, display_order),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [name, description, icon, color, scaleId, displayOrder, id]);

    res.json({ success: true, data: transformToCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Error updating category' });
  }
});

// DELETE /skills/categories/:id - Desactivar categoría
router.delete('/categories/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await query(`UPDATE skill_categories SET is_active = FALSE WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Categoría desactivada' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'Error deleting category' });
  }
});

// ============================================================================
// HABILIDADES (DEFINITIONS)
// ============================================================================

// GET /skills/definitions - Listar habilidades
router.get('/definitions', authenticateToken, async (req, res) => {
  const { categoryId } = req.query;

  try {
    let sql = `
      SELECT sd.id, sd.category_id, sd.name, sd.code, sd.description, sd.default_target,
        sd.display_order, sd.is_active, sd.created_at, sd.updated_at,
        sd.level_1_criteria, sd.level_2_criteria, sd.level_3_criteria,
        sd.level_4_criteria, sd.level_5_criteria,
        sc.name as category_name, sc.icon as category_icon, sc.color as category_color
      FROM skill_definitions sd
      JOIN skill_categories sc ON sd.category_id = sc.id
      WHERE sd.is_active = TRUE
    `;
    const params = [];

    if (categoryId) {
      params.push(categoryId);
      sql += ` AND sd.category_id = $${params.length}`;
    }

    sql += ` ORDER BY sc.display_order, sd.display_order, sd.name`;

    const result = await query(sql, params);
    res.json({ success: true, data: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching definitions:', error);
    res.status(500).json({ success: false, message: 'Error fetching definitions' });
  }
});

// POST /skills/definitions - Crear habilidad
router.post('/definitions', authenticateToken, async (req, res) => {
  const { categoryId, name, code, description, defaultTarget, displayOrder,
          level1Criteria, level2Criteria, level3Criteria, level4Criteria, level5Criteria,
          retrainingDays } = req.body;

  try {
    const result = await query(`
      INSERT INTO skill_definitions (category_id, name, code, description, default_target, display_order,
        level_1_criteria, level_2_criteria, level_3_criteria, level_4_criteria, level_5_criteria, retraining_days)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [categoryId, name, code, description, defaultTarget || 3, displayOrder || 0,
        level1Criteria, level2Criteria, level3Criteria, level4Criteria, level5Criteria,
        retrainingDays || null]);

    res.json({ success: true, data: transformToCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('Error creating definition:', error);
    res.status(500).json({ success: false, message: 'Error creating definition' });
  }
});

// PUT /skills/definitions/:id
router.put('/definitions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, description, defaultTarget, displayOrder,
          level1Criteria, level2Criteria, level3Criteria, level4Criteria, level5Criteria,
          retrainingDays } = req.body;

  try {
    const result = await query(`
      UPDATE skill_definitions
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          default_target = COALESCE($3, default_target),
          display_order = COALESCE($4, display_order),
          level_1_criteria = COALESCE($5, level_1_criteria),
          level_2_criteria = COALESCE($6, level_2_criteria),
          level_3_criteria = COALESCE($7, level_3_criteria),
          level_4_criteria = COALESCE($8, level_4_criteria),
          level_5_criteria = COALESCE($9, level_5_criteria),
          retraining_days = $10,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [name, description, defaultTarget, displayOrder,
        level1Criteria, level2Criteria, level3Criteria, level4Criteria, level5Criteria,
        retrainingDays, id]);

    res.json({ success: true, data: transformToCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('Error updating definition:', error);
    res.status(500).json({ success: false, message: 'Error updating definition' });
  }
});

// DELETE /skills/definitions/:id
router.delete('/definitions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await query(`UPDATE skill_definitions SET is_active = FALSE WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Habilidad desactivada' });
  } catch (error) {
    console.error('Error deleting definition:', error);
    res.status(500).json({ success: false, message: 'Error deleting definition' });
  }
});

// ============================================================================
// PERFILES DE PUESTO
// ============================================================================

// GET /skills/profiles - Listar perfiles
router.get('/profiles', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT sp.*,
        d.name as department_name,
        (SELECT COUNT(*) FROM skill_profile_items WHERE profile_id = sp.id) as skill_count,
        (SELECT COUNT(*) FROM users WHERE skill_profile_id = sp.id) as user_count
      FROM skill_profiles sp
      LEFT JOIN departments d ON sp.department_id = d.id
      WHERE sp.is_active = TRUE
      ORDER BY sp.name
    `);
    res.json({ success: true, data: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ success: false, message: 'Error fetching profiles' });
  }
});

// GET /skills/profiles/:id - Detalle de perfil con habilidades
router.get('/profiles/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const profile = await query(`
      SELECT sp.*, d.name as department_name
      FROM skill_profiles sp
      LEFT JOIN departments d ON sp.department_id = d.id
      WHERE sp.id = $1
    `, [id]);

    if (profile.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Perfil no encontrado' });
    }

    const skills = await query(`
      SELECT spi.*, sd.name as skill_name, sd.code as skill_code,
        sc.name as category_name, sc.icon as category_icon, sc.color as category_color
      FROM skill_profile_items spi
      JOIN skill_definitions sd ON spi.skill_id = sd.id
      JOIN skill_categories sc ON sd.category_id = sc.id
      WHERE spi.profile_id = $1
      ORDER BY sc.display_order, sd.display_order
    `, [id]);

    res.json({
      success: true,
      data: {
        ...transformToCamelCase(profile.rows[0]),
        skills: transformToCamelCase(skills.rows)
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
});

// POST /skills/profiles - Crear perfil
router.post('/profiles', authenticateToken, async (req, res) => {
  const { name, code, description, departmentId, skills } = req.body;

  try {
    const result = await query(`
      INSERT INTO skill_profiles (name, code, description, department_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [name, code, description, departmentId]);

    const profileId = result.rows[0].id;

    if (skills && skills.length > 0) {
      for (const skill of skills) {
        await query(`
          INSERT INTO skill_profile_items (profile_id, skill_id, target_level, is_required)
          VALUES ($1, $2, $3, $4)
        `, [profileId, skill.skillId, skill.targetLevel || 3, skill.isRequired !== false]);
      }
    }

    res.json({ success: true, data: { id: profileId } });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ success: false, message: 'Error creating profile' });
  }
});

// PUT /skills/profiles/:id/skills - Actualizar habilidades de perfil
router.put('/profiles/:id/skills', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { skills } = req.body;

  try {
    // Eliminar existentes y reinsertar
    await query(`DELETE FROM skill_profile_items WHERE profile_id = $1`, [id]);

    if (skills && skills.length > 0) {
      for (const skill of skills) {
        await query(`
          INSERT INTO skill_profile_items (profile_id, skill_id, target_level, is_required)
          VALUES ($1, $2, $3, $4)
        `, [id, skill.skillId, skill.targetLevel || 3, skill.isRequired !== false]);
      }
    }

    res.json({ success: true, message: 'Habilidades actualizadas' });
  } catch (error) {
    console.error('Error updating profile skills:', error);
    res.status(500).json({ success: false, message: 'Error updating profile skills' });
  }
});

// ============================================================================
// MI EQUIPO
// ============================================================================

// GET /skills/team - Obtener mi equipo
router.get('/team', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await query(`SELECT * FROM v_team_members WHERE manager_id = $1`, [userId]);
    res.json({ success: true, data: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ success: false, message: 'Error fetching team' });
  }
});

// ============================================================================
// ASIGNACIONES DE USUARIO
// ============================================================================

// GET /skills/users/:userId/assignments - Habilidades asignadas a usuario
router.get('/users/:userId/assignments', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    // Obtener info del usuario
    const userResult = await query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.photo_path, u.position,
        u.skill_profile_id, sp.name as profile_name,
        d.name as department_name
      FROM users u
      LEFT JOIN skill_profiles sp ON u.skill_profile_id = sp.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Obtener habilidades (del perfil + individuales)
    const skillsResult = await query(`
      SELECT * FROM v_user_skills WHERE user_id = $1
    `, [userId]);

    res.json({
      success: true,
      data: {
        user: transformToCamelCase(userResult.rows[0]),
        skills: transformToCamelCase(skillsResult.rows)
      }
    });
  } catch (error) {
    console.error('Error fetching user assignments:', error);
    res.status(500).json({ success: false, message: 'Error fetching user assignments' });
  }
});

// PUT /skills/users/:userId/profile - Asignar perfil a usuario
router.put('/users/:userId/profile', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { profileId } = req.body;
  const assignedBy = req.user.id;

  try {
    // Desactivar perfiles anteriores del usuario
    await query(`
      UPDATE user_skill_profiles SET is_active = FALSE, end_date = CURRENT_DATE
      WHERE user_id = $1 AND is_active = TRUE
    `, [userId]);

    if (profileId) {
      // Insertar nuevo perfil activo (o reactivar si ya existe para hoy)
      await query(`
        INSERT INTO user_skill_profiles (user_id, profile_id, assigned_by, is_active, start_date)
        VALUES ($1, $2, $3, TRUE, CURRENT_DATE)
        ON CONFLICT (user_id, profile_id, start_date)
        DO UPDATE SET is_active = TRUE, end_date = NULL, assigned_by = $3
      `, [userId, profileId, assignedBy]);
    }

    // Actualizar campo en users
    await query(`UPDATE users SET skill_profile_id = $1 WHERE id = $2`, [profileId || null, userId]);

    res.json({ success: true, message: 'Perfil asignado' });
  } catch (error) {
    console.error('Error assigning profile:', error);
    res.status(500).json({ success: false, message: 'Error assigning profile' });
  }
});

// GET /skills/users/:userId/profiles - Obtener todos los perfiles del usuario
router.get('/users/:userId/profiles', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await query(`
      SELECT * FROM v_user_all_profiles WHERE user_id = $1 ORDER BY is_active DESC, start_date DESC
    `, [userId]);

    res.json({ success: true, data: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching user profiles:', error);
    res.status(500).json({ success: false, message: 'Error fetching user profiles' });
  }
});

// POST /skills/users/:userId/profiles - Agregar perfil a usuario
router.post('/users/:userId/profiles', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { profileId, notes } = req.body;
  const assignedBy = req.user.id;

  try {
    const result = await query(`
      INSERT INTO user_skill_profiles (user_id, profile_id, assigned_by, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [userId, profileId, assignedBy, notes]);

    res.json({ success: true, data: { id: result.rows[0].id }, message: 'Perfil agregado' });
  } catch (error) {
    console.error('Error adding profile:', error);
    res.status(500).json({ success: false, message: 'Error adding profile' });
  }
});

// DELETE /skills/users/:userId/profiles/:profileId - Desactivar perfil de usuario
router.delete('/users/:userId/profiles/:profileId', authenticateToken, async (req, res) => {
  const { userId, profileId } = req.params;

  try {
    await query(`
      UPDATE user_skill_profiles
      SET is_active = FALSE, end_date = CURRENT_DATE
      WHERE user_id = $1 AND profile_id = $2 AND is_active = TRUE
    `, [userId, profileId]);

    res.json({ success: true, message: 'Perfil desactivado' });
  } catch (error) {
    console.error('Error removing profile:', error);
    res.status(500).json({ success: false, message: 'Error removing profile' });
  }
});

// GET /skills/users/:userId/history-chart - Datos para gráfica de evolución
router.get('/users/:userId/history-chart', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    const history = await query(`
      SELECT
        se.id as evaluation_id,
        se.evaluation_date,
        se.period,
        se.overall_score,
        json_agg(json_build_object(
          'categoryId', sc.id,
          'categoryName', sc.name,
          'color', sc.color,
          'avgScore', cat_scores.avg_score
        )) as by_category
      FROM skill_evaluations se
      LEFT JOIN LATERAL (
        SELECT sd.category_id, ROUND(AVG(ses.score)::numeric, 2) as avg_score
        FROM skill_evaluation_scores ses
        JOIN skill_definitions sd ON ses.skill_id = sd.id
        WHERE ses.evaluation_id = se.id
        GROUP BY sd.category_id
      ) cat_scores ON TRUE
      LEFT JOIN skill_categories sc ON cat_scores.category_id = sc.id
      WHERE se.user_id = $1 AND se.status = 'COMPLETED'
      GROUP BY se.id, se.evaluation_date, se.period, se.overall_score
      ORDER BY se.evaluation_date ASC
    `, [userId]);

    res.json({ success: true, data: transformToCamelCase(history.rows) });
  } catch (error) {
    console.error('Error fetching history chart:', error);
    res.status(500).json({ success: false, message: 'Error fetching history chart' });
  }
});

// GET /skills/users/:userId/training-history - Historial completo de capacitaciones (CV)
router.get('/users/:userId/training-history', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    const history = await query(`
      SELECT * FROM v_user_training_history WHERE user_id = $1
    `, [userId]);

    // También obtener habilidades actuales con vigencia
    const currentSkills = await query(`
      SELECT * FROM v_user_current_skills WHERE user_id = $1
    `, [userId]);

    res.json({
      success: true,
      data: {
        history: transformToCamelCase(history.rows),
        currentSkills: transformToCamelCase(currentSkills.rows)
      }
    });
  } catch (error) {
    console.error('Error fetching training history:', error);
    res.status(500).json({ success: false, message: 'Error fetching training history' });
  }
});

// POST /skills/users/:userId/assignments - Asignar habilidad individual
router.post('/users/:userId/assignments', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { skillId, targetLevel, notes } = req.body;
  const assignedBy = req.user.id;

  try {
    await query(`
      INSERT INTO user_skill_assignments (user_id, skill_id, target_level, assigned_by, notes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, skill_id) DO UPDATE SET
        target_level = EXCLUDED.target_level,
        assigned_by = EXCLUDED.assigned_by,
        assigned_at = CURRENT_TIMESTAMP,
        notes = EXCLUDED.notes
    `, [userId, skillId, targetLevel, assignedBy, notes]);

    res.json({ success: true, message: 'Habilidad asignada' });
  } catch (error) {
    console.error('Error assigning skill:', error);
    res.status(500).json({ success: false, message: 'Error assigning skill' });
  }
});

// POST /skills/users/:userId/photo - Subir foto
router.post('/users/:userId/photo', authenticateToken, photoUpload.single('photo'), async (req, res) => {
  const { userId } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se proporcionó imagen' });
    }

    const photoPath = `/uploads/photos/${req.file.filename}`;
    await query(`UPDATE users SET photo_path = $1 WHERE id = $2`, [photoPath, userId]);

    res.json({ success: true, photoPath });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ success: false, message: 'Error uploading photo' });
  }
});

// ============================================================================
// EVALUACIONES
// ============================================================================

// GET /skills/evaluations - Listar evaluaciones
router.get('/evaluations', authenticateToken, async (req, res) => {
  const { userId, status } = req.query;

  try {
    let sql = `
      SELECT se.*,
        u.first_name || ' ' || u.last_name as user_name,
        ev.first_name || ' ' || ev.last_name as evaluator_name
      FROM skill_evaluations se
      JOIN users u ON se.user_id = u.id
      JOIN users ev ON se.evaluated_by = ev.id
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      params.push(userId);
      sql += ` AND se.user_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND se.status = $${params.length}`;
    }

    sql += ` ORDER BY se.evaluation_date DESC`;

    const result = await query(sql, params);
    res.json({ success: true, data: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    res.status(500).json({ success: false, message: 'Error fetching evaluations' });
  }
});

// GET /skills/evaluations/:id - Detalle de evaluación
router.get('/evaluations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const evalResult = await query(`
      SELECT se.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email, u.photo_path, u.position,
        ev.first_name || ' ' || ev.last_name as evaluator_name
      FROM skill_evaluations se
      JOIN users u ON se.user_id = u.id
      JOIN users ev ON se.evaluated_by = ev.id
      WHERE se.id = $1
    `, [id]);

    if (evalResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Evaluación no encontrada' });
    }

    const scoresResult = await query(`
      SELECT ses.id, ses.evaluation_id, ses.skill_id, ses.score, ses.target, ses.gap,
        ses.notes, ses.evidence_path, ses.evidence_filename, ses.training_type, ses.expires_at,
        sd.name as skill_name, sd.code as skill_code,
        sc.name as category_name, sc.icon as category_icon, sc.color as category_color
      FROM skill_evaluation_scores ses
      JOIN skill_definitions sd ON ses.skill_id = sd.id
      JOIN skill_categories sc ON sd.category_id = sc.id
      WHERE ses.evaluation_id = $1
      ORDER BY sc.display_order, sd.display_order
    `, [id]);

    const byCategory = await query(`
      SELECT * FROM v_evaluation_by_category WHERE evaluation_id = $1
    `, [id]);

    res.json({
      success: true,
      data: {
        ...transformToCamelCase(evalResult.rows[0]),
        scores: transformToCamelCase(scoresResult.rows),
        byCategory: transformToCamelCase(byCategory.rows)
      }
    });
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    res.status(500).json({ success: false, message: 'Error fetching evaluation' });
  }
});

// POST /skills/evaluations - Crear evaluación
router.post('/evaluations', authenticateToken, async (req, res) => {
  const { userId, period, notes, scores } = req.body;
  const evaluatedBy = req.user.id;

  try {
    const result = await query(`
      INSERT INTO skill_evaluations (user_id, evaluated_by, period, notes, status)
      VALUES ($1, $2, $3, $4, 'DRAFT')
      RETURNING id
    `, [userId, evaluatedBy, period || null, notes]);

    const evaluationId = result.rows[0].id;
    const createdScores = [];

    if (scores && scores.length > 0) {
      for (const score of scores) {
        const scoreResult = await query(`
          INSERT INTO skill_evaluation_scores (evaluation_id, skill_id, score, target, notes, training_type)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [evaluationId, score.skillId, score.score, score.target, score.notes, score.trainingType || null]);

        createdScores.push({
          scoreId: scoreResult.rows[0].id,
          skillId: score.skillId
        });
      }

      // Calcular score general
      const avgResult = await query(`
        SELECT ROUND(AVG(score)::numeric, 2) as avg_score
        FROM skill_evaluation_scores WHERE evaluation_id = $1
      `, [evaluationId]);

      await query(`
        UPDATE skill_evaluations SET overall_score = $1 WHERE id = $2
      `, [avgResult.rows[0].avg_score, evaluationId]);
    }

    res.json({ success: true, data: { id: evaluationId, scores: createdScores } });
  } catch (error) {
    console.error('Error creating evaluation:', error);
    res.status(500).json({ success: false, message: 'Error creating evaluation' });
  }
});

// PUT /skills/evaluations/:id/complete - Completar evaluación
router.put('/evaluations/:id/complete', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await query(`
      UPDATE skill_evaluations
      SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    res.json({ success: true, message: 'Evaluación completada' });
  } catch (error) {
    console.error('Error completing evaluation:', error);
    res.status(500).json({ success: false, message: 'Error completing evaluation' });
  }
});

// ============================================================================
// PERFIL DE USUARIO (VISTA PÚBLICA)
// ============================================================================

// GET /skills/profile/:userId - Perfil completo con radar
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    // Info usuario
    const userResult = await query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.photo_path, u.position,
        u.skill_profile_id,
        d.name as department_name,
        m.first_name || ' ' || m.last_name as manager_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Perfiles del usuario - primero intenta la tabla user_skill_profiles
    let profiles = await query(`
      SELECT * FROM v_user_all_profiles WHERE user_id = $1 ORDER BY is_active DESC, start_date DESC
    `, [userId]);

    // Fallback: Si no hay registros en user_skill_profiles pero sí en users.skill_profile_id
    if (profiles.rows.length === 0 && userResult.rows[0].skill_profile_id) {
      profiles = await query(`
        SELECT
          0 as id,
          $1::integer as user_id,
          sp.id as profile_id,
          sp.name as profile_name,
          sp.code as profile_code,
          sp.description as profile_description,
          CURRENT_TIMESTAMP as assigned_at,
          CURRENT_DATE as start_date,
          NULL::date as end_date,
          TRUE as is_active,
          NULL as notes,
          NULL as assigned_by_name,
          (SELECT COUNT(*) FROM skill_profile_items WHERE profile_id = sp.id) as skill_count
        FROM skill_profiles sp
        WHERE sp.id = $2
      `, [userId, userResult.rows[0].skill_profile_id]);
    }

    // Última evaluación
    const lastEval = await query(`
      SELECT * FROM v_user_latest_evaluation WHERE user_id = $1
    `, [userId]);

    // Scores por categoría (para radar) - Usa TODOS los scores históricos del usuario
    // Agrupa por categoría usando la última evaluación de cada habilidad
    const radarResult = await query(`
      SELECT
        sc.id as category_id,
        sc.name as category_name,
        sc.icon,
        sc.color,
        ROUND(AVG(vcs.score)::numeric, 2) as avg_score,
        ROUND(AVG(vcs.target)::numeric, 2) as avg_target,
        COUNT(*) as skill_count
      FROM v_user_current_skills vcs
      JOIN skill_definitions sd ON vcs.skill_id = sd.id
      JOIN skill_categories sc ON sd.category_id = sc.id
      WHERE vcs.user_id = $1
      GROUP BY sc.id, sc.name, sc.icon, sc.color
      ORDER BY sc.display_order
    `, [userId]);
    const radarData = radarResult.rows;

    // Historial de evaluaciones
    const history = await query(`
      SELECT se.id, se.evaluation_date, se.period, se.overall_score, se.status,
        ev.first_name || ' ' || ev.last_name as evaluator_name
      FROM skill_evaluations se
      JOIN users ev ON se.evaluated_by = ev.id
      WHERE se.user_id = $1
      ORDER BY se.evaluation_date DESC
      LIMIT 20
    `, [userId]);

    // Habilidades actuales con vigencia (CV)
    const currentSkills = await query(`
      SELECT * FROM v_user_current_skills WHERE user_id = $1 ORDER BY category_name, skill_name
    `, [userId]);

    // Nombre de perfiles activos para mostrar
    const activeProfiles = profiles.rows.filter(p => p.is_active);
    const profileNames = activeProfiles.map(p => p.profile_name).join(', ') || 'Sin asignar';

    res.json({
      success: true,
      data: {
        user: {
          ...transformToCamelCase(userResult.rows[0]),
          profileName: profileNames,
          profileCount: activeProfiles.length
        },
        profiles: transformToCamelCase(profiles.rows),
        lastEvaluation: lastEval.rows[0] ? transformToCamelCase(lastEval.rows[0]) : null,
        radarData: transformToCamelCase(radarData),
        history: transformToCamelCase(history.rows),
        currentSkills: transformToCamelCase(currentSkills.rows)
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
});

// ============================================================================
// EVIDENCIAS DE CAPACITACIÓN
// ============================================================================

// POST /skills/scores/:scoreId/evidence - Subir evidencia a un score
router.post('/scores/:scoreId/evidence', authenticateToken, evidenceUpload.single('evidence'), async (req, res) => {
  const { scoreId } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se proporcionó archivo' });
    }

    const evidencePath = `/uploads/evidence/${req.file.filename}`;
    const originalFilename = req.file.originalname;

    await query(`
      UPDATE skill_evaluation_scores
      SET evidence_path = $1, evidence_filename = $2
      WHERE id = $3
    `, [evidencePath, originalFilename, scoreId]);

    res.json({ success: true, evidencePath, filename: originalFilename });
  } catch (error) {
    console.error('Error uploading evidence:', error);
    res.status(500).json({ success: false, message: 'Error uploading evidence' });
  }
});

// GET /skills/scores/:scoreId/evidence - Descargar evidencia
router.get('/scores/:scoreId/evidence', authenticateToken, async (req, res) => {
  const { scoreId } = req.params;

  try {
    const result = await query(`
      SELECT evidence_path, evidence_filename FROM skill_evaluation_scores WHERE id = $1
    `, [scoreId]);

    if (result.rows.length === 0 || !result.rows[0].evidence_path) {
      return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
    }

    const filePath = path.join(__dirname, '..', result.rows[0].evidence_path);
    const filename = result.rows[0].evidence_filename || 'evidence';

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    res.download(filePath, filename);
  } catch (error) {
    console.error('Error downloading evidence:', error);
    res.status(500).json({ success: false, message: 'Error downloading evidence' });
  }
});

// GET /skills/users/:userId/history-pivot - Datos para tabla histórica pivote
router.get('/users/:userId/history-pivot', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { limit = 20, showAll = 'false' } = req.query;

  try {
    // Obtener perfil actual del usuario
    const userResult = await query(`SELECT skill_profile_id FROM users WHERE id = $1`, [userId]);
    const currentProfileId = userResult.rows[0]?.skill_profile_id;

    // Obtener fechas de evaluación (columnas) - ordenadas por fecha Y id para orden determinístico
    const datesResult = await query(`
      SELECT DISTINCT se.id as evaluation_id, se.evaluation_date, se.created_at
      FROM skill_evaluations se
      WHERE se.user_id = $1 AND se.status = 'COMPLETED'
      ORDER BY se.evaluation_date DESC, se.id DESC
      LIMIT $2
    `, [userId, parseInt(limit)]);

    const dates = datesResult.rows;

    // Obtener habilidades: del perfil actual si existe, o todas las evaluadas si showAll=true
    let skillsResult;
    if (currentProfileId && showAll !== 'true') {
      // Solo habilidades del perfil actual
      skillsResult = await query(`
        SELECT
          sd.id as skill_id,
          sd.name as skill_name,
          sd.code as skill_code,
          sc.id as category_id,
          sc.name as category_name,
          sc.color as category_color,
          sc.display_order as cat_order,
          sd.display_order as skill_order,
          spi.target_level as profile_target
        FROM skill_profile_items spi
        JOIN skill_definitions sd ON spi.skill_id = sd.id
        JOIN skill_categories sc ON sd.category_id = sc.id
        WHERE spi.profile_id = $1 AND sd.is_active = TRUE
        ORDER BY sc.display_order, sd.display_order, sd.name
      `, [currentProfileId]);
    } else {
      // Todas las habilidades evaluadas históricamente (modo curriculum/showAll)
      skillsResult = await query(`
        SELECT DISTINCT ON (sd.id)
          sd.id as skill_id,
          sd.name as skill_name,
          sd.code as skill_code,
          sc.id as category_id,
          sc.name as category_name,
          sc.color as category_color,
          NULL::integer as profile_target
        FROM skill_evaluation_scores ses
        JOIN skill_evaluations se ON ses.evaluation_id = se.id
        JOIN skill_definitions sd ON ses.skill_id = sd.id
        JOIN skill_categories sc ON sd.category_id = sc.id
        WHERE se.user_id = $1 AND se.status = 'COMPLETED'
        ORDER BY sd.id, sc.name, sd.name
      `, [userId]);
    }

    const skills = skillsResult.rows;

    // Obtener todos los scores
    const scoresResult = await query(`
      SELECT
        ses.id as score_id,
        ses.skill_id,
        ses.evaluation_id,
        ses.score,
        ses.target,
        ses.training_type,
        ses.evidence_path,
        ses.evidence_filename,
        ses.notes,
        se.evaluation_date
      FROM skill_evaluation_scores ses
      JOIN skill_evaluations se ON ses.evaluation_id = se.id
      WHERE se.user_id = $1 AND se.status = 'COMPLETED'
    `, [userId]);

    // Obtener último score por habilidad (score actual)
    const currentScoresResult = await query(`
      SELECT DISTINCT ON (ses.skill_id)
        ses.skill_id,
        ses.score,
        ses.target
      FROM skill_evaluation_scores ses
      JOIN skill_evaluations se ON ses.evaluation_id = se.id
      WHERE se.user_id = $1 AND se.status = 'COMPLETED'
      ORDER BY ses.skill_id, se.evaluation_date DESC, se.id DESC
    `, [userId]);

    const currentScoreMap = {};
    for (const cs of currentScoresResult.rows) {
      currentScoreMap[cs.skill_id] = { score: cs.score, target: cs.target };
    }

    // Construir matriz pivote
    const scoreMap = {};
    for (const score of scoresResult.rows) {
      const key = `${score.skill_id}-${score.evaluation_id}`;
      scoreMap[key] = score;
    }

    const pivotData = skills.map(skill => {
      const currentScore = currentScoreMap[skill.skill_id] || {};
      const row = {
        skillId: skill.skill_id,
        skillName: skill.skill_name,
        skillCode: skill.skill_code,
        categoryId: skill.category_id,
        categoryName: skill.category_name,
        categoryColor: skill.category_color,
        currentScore: currentScore.score || null,
        // Usar target de la evaluación, o del perfil si no hay evaluación
        currentTarget: currentScore.target || skill.profile_target || null,
        profileTarget: skill.profile_target || null,
        evaluations: []
      };

      for (const date of dates) {
        const key = `${skill.skill_id}-${date.evaluation_id}`;
        const score = scoreMap[key];
        row.evaluations.push({
          evaluationId: date.evaluation_id,
          date: date.evaluation_date,
          scoreId: score?.score_id || null,
          score: score?.score || null,
          target: score?.target || null,
          trainingType: score?.training_type || null,
          hasEvidence: !!score?.evidence_path,
          evidenceFilename: score?.evidence_filename || null,
          notes: score?.notes || null
        });
      }

      return row;
    });

    // Calcular promedio actual - suma de scores / total de habilidades del perfil
    // Las habilidades no evaluadas cuentan como 0
    const skillsWithScore = pivotData.filter(s => s.currentScore !== null);
    const totalCurrentScore = skillsWithScore.reduce((sum, s) => sum + s.currentScore, 0);
    // Dividir entre TODAS las habilidades del perfil, no solo las evaluadas
    const avgCurrentScore = pivotData.length > 0 ? (totalCurrentScore / pivotData.length).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        dates: dates.map(d => ({ evaluationId: d.evaluation_id, date: d.evaluation_date, createdAt: d.created_at })),
        skills: pivotData,
        currentAvgScore: parseFloat(avgCurrentScore),
        profileId: currentProfileId || null,
        showingAllSkills: showAll === 'true' || !currentProfileId,
        totalProfileSkills: skills.length,
        skillsEvaluated: skillsWithScore.length
      }
    });
  } catch (error) {
    console.error('Error fetching history pivot:', error);
    res.status(500).json({ success: false, message: 'Error fetching history pivot' });
  }
});

// GET /skills/scores/:scoreId - Detalle de un score específico (para modal)
router.get('/scores/:scoreId', authenticateToken, async (req, res) => {
  const { scoreId } = req.params;

  try {
    const result = await query(`
      SELECT
        ses.*,
        sd.name as skill_name,
        sd.code as skill_code,
        sd.description as skill_description,
        sd.level_1_criteria, sd.level_2_criteria, sd.level_3_criteria,
        sd.level_4_criteria, sd.level_5_criteria,
        sc.name as category_name,
        sc.color as category_color,
        se.evaluation_date,
        ev.first_name || ' ' || ev.last_name as evaluator_name,
        u.first_name || ' ' || u.last_name as user_name
      FROM skill_evaluation_scores ses
      JOIN skill_evaluations se ON ses.evaluation_id = se.id
      JOIN skill_definitions sd ON ses.skill_id = sd.id
      JOIN skill_categories sc ON sd.category_id = sc.id
      JOIN users ev ON se.evaluated_by = ev.id
      JOIN users u ON se.user_id = u.id
      WHERE ses.id = $1
    `, [scoreId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Score no encontrado' });
    }

    res.json({ success: true, data: transformToCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('Error fetching score:', error);
    res.status(500).json({ success: false, message: 'Error fetching score' });
  }
});

// ============================================================================
// DASHBOARD
// ============================================================================

// GET /skills/dashboard - Dashboard gerencial
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Total usuarios con perfil
    const usersWithProfile = await query(`
      SELECT COUNT(*) as total FROM users WHERE skill_profile_id IS NOT NULL AND is_active = TRUE
    `);

    // Evaluaciones por estado
    const evalsByStatus = await query(`
      SELECT status, COUNT(*) as count
      FROM skill_evaluations
      GROUP BY status
    `);

    // Promedio general por categoría
    const avgByCategory = await query(`
      SELECT sc.name as category_name, sc.icon, sc.color,
        ROUND(AVG(ses.score)::numeric, 2) as avg_score,
        ROUND(AVG(ses.target)::numeric, 2) as avg_target
      FROM skill_evaluation_scores ses
      JOIN skill_definitions sd ON ses.skill_id = sd.id
      JOIN skill_categories sc ON sd.category_id = sc.id
      JOIN skill_evaluations se ON ses.evaluation_id = se.id
      WHERE se.status = 'COMPLETED'
      GROUP BY sc.id, sc.name, sc.icon, sc.color
      ORDER BY sc.display_order
    `);

    // Habilidades con mayor gap
    const topGaps = await query(`
      SELECT sd.name as skill_name, sc.name as category_name,
        ROUND(AVG(ses.gap)::numeric, 2) as avg_gap,
        COUNT(*) as eval_count
      FROM skill_evaluation_scores ses
      JOIN skill_definitions sd ON ses.skill_id = sd.id
      JOIN skill_categories sc ON sd.category_id = sc.id
      JOIN skill_evaluations se ON ses.evaluation_id = se.id
      WHERE se.status = 'COMPLETED'
      GROUP BY sd.id, sd.name, sc.name
      HAVING AVG(ses.gap) > 0
      ORDER BY avg_gap DESC
      LIMIT 10
    `);

    // Capacitaciones por vencer
    const expiringTraining = await query(`
      SELECT * FROM v_training_expiring
      WHERE status IN ('EXPIRED', 'EXPIRING_SOON')
      LIMIT 20
    `);

    res.json({
      success: true,
      data: {
        usersWithProfile: parseInt(usersWithProfile.rows[0].total),
        evaluationsByStatus: transformToCamelCase(evalsByStatus.rows),
        avgByCategory: transformToCamelCase(avgByCategory.rows),
        topGaps: transformToCamelCase(topGaps.rows),
        expiringTraining: transformToCamelCase(expiringTraining.rows)
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard' });
  }
});

module.exports = router;
