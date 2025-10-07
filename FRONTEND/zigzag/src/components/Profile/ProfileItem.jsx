import React from "react";
import styles from "./Profile.module.css";

const ProofileItem = ({
  timetable,
  remoteDaysCount,
  remoteDays,
  lookingFor,
  readOnly = false,
  selectedDay,
  onSelectDay,
  startTime,
  endTime,
  onChangeStartTime,
  onChangeEndTime,
  onSaveTimeRange,
  onCancelSelectDay,
  onChangeRemoteDaysCount,
  onToggleRemoteDay,
  onChangeLookingFor,
}) => {
  // Define the correct order of days starting with Monday
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Disponibilité</h2>

        <div className={styles.subSection}>
          <h3 className={styles.subTitle}>Emploi du temps</h3>
          <div className={styles.timetable}>
            {dayOrder.map((day) => (
              <div
                key={day}
                className={styles.timetableDay}
                onClick={readOnly ? undefined : () => onSelectDay && onSelectDay(day)}
                style={{ cursor: readOnly ? "default" : "pointer" }}
              >
                <h4>{day}</h4>
                <p>
                  {timetable[day]?.start
                    ? `${timetable[day].start} - ${timetable[day].end}`
                    : "XX:XX"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {!readOnly && selectedDay && (
          <div className={styles.timeRangePickerModal}>
            <div className={styles.timeRangePicker}>
              <h4>Définir les heures pour {selectedDay}</h4>
              <input
                type="time"
                value={startTime}
                onChange={(e) => onChangeStartTime && onChangeStartTime(e.target.value)}
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => onChangeEndTime && onChangeEndTime(e.target.value)}
              />
              <div className={styles.buttonContainer}>
                <button onClick={onSaveTimeRange}>Sauvegarder</button>
                <button onClick={onCancelSelectDay}>Annuler</button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.subSection}>
          <h3 className={styles.subTitle}>Télétravail</h3>
          <div className={styles.remoteWorkSection}>
            <label className={styles.remoteDaysLabel}>
              <span>Jours de télétravail / Semaine :</span>
              <input
                type="number"
                value={remoteDaysCount}
                onChange={readOnly ? undefined : (e) => onChangeRemoteDaysCount && onChangeRemoteDaysCount(e)}
                min="0"
                max="7"
                className={styles.remoteDaysInput}
                disabled={!readOnly && selectedDay !== null}
                readOnly={readOnly}
              />
            </label>
            <div className={styles.remoteDaysBar}>
              {dayOrder.map((day) => (
                <div
                  key={day}
                  className={`${styles.remoteDay} ${remoteDays[day] ? styles.active : ""} ${!readOnly && selectedDay !== null ? styles.disabled : ""}`}
                  onClick={readOnly ? undefined : () => onToggleRemoteDay && onToggleRemoteDay(day)}
                >
                  {day.slice(0, 3)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Que recherchez-vous ?</h2>
        {readOnly ? (
          <div className={styles.lookingForInput} style={{ whiteSpace: "pre-wrap" }}>
            {lookingFor || "—"}
          </div>
        ) : (
          <textarea
            value={lookingFor}
            onChange={(e) => onChangeLookingFor && onChangeLookingFor(e.target.value)}
            className={styles.lookingForInput}
            placeholder="Décrivez ce que vous recherchez..."
            rows={4}
          />
        )}
      </section>
    </>
  );
};

export default ProofileItem;


