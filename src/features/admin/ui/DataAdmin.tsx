/** 数据管理（PRD M9 / US-10）：导出、导入（合并/替换）、恢复内置内容 */

import { useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { LIMITS } from '../../../domain/constants';
import type { ExportBundle, ImportMode, ImportPlan } from '../../../domain/entities/card';
import { exportFileName, planImport } from '../../../domain/services/importExport';
import { parseImportBundle } from '../../../domain/services/validation';
import { Button } from '../../../shared/ui/Button';
import { DangerConfirm } from '../../../shared/ui/DangerConfirm';
import { Modal } from '../../../shared/ui/Modal';
import { toast } from '../../../shared/store/toastStore';
import { downloadJson, readFileAsText } from '../../../shared/utils/download';
import { formatBytes } from '../../../shared/utils/image';

interface PendingImport {
  bundle: ExportBundle;
  plan: ImportPlan;
  fileName: string;
}

const MODE_LABEL: Record<ImportMode, string> = {
  merge: '合并',
  replace: '替换',
};

export function DataAdmin() {
  const { categories, cards, exportBundle, importBundle, resetToSeed, usageBytes, seedVersion } = useCatalog();
  const [mode, setMode] = useState<ImportMode>('merge');
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const usage = usageBytes();

  const onExport = () => {
    try {
      const bundle = exportBundle();
      downloadJson(exportFileName(new Date()), bundle);
      toast(`已导出 ${bundle.cards.length} 张卡片`);
    } catch (error) {
      toast(error instanceof Error ? error.message : '导出失败', 'error');
    }
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > LIMITS.IMPORT_MAX_BYTES) {
      toast(`文件超过 ${formatBytes(LIMITS.IMPORT_MAX_BYTES)}，请拆分后再导入`, 'error');
      return;
    }
    try {
      const text = await readFileAsText(file);
      const parsed = parseImportBundle(JSON.parse(text) as unknown);
      if (!parsed.ok) {
        toast(parsed.message, 'error');
        return;
      }
      const plan = planImport({ categories, cards }, parsed.data, mode);
      setPending({ bundle: parsed.data, plan, fileName: file.name });
    } catch {
      toast('文件解析失败，请确认是「童识」导出的 JSON 文件', 'error');
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await importBundle(pending.bundle, mode);
      toast(
        mode === 'replace'
          ? `已替换为 ${pending.plan.cardsTotal} 张卡片`
          : `已合并：新增 ${pending.plan.cardsAdded} 张，更新 ${pending.plan.cardsUpdated} 张`,
      );
      setPending(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : '导入失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = async () => {
    setBusy(true);
    try {
      await resetToSeed();
      toast('已恢复为内置内容');
      setResetOpen(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : '恢复失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="panel">
        <h2 className="panel__title">数据概览</h2>
        <div className="row">
          <div className="row__grow">
            <p className="row__title">内容规模</p>
            <p className="row__meta">
              {categories.length} 个分类 · {cards.length} 张卡片 · 内置内容版本 v{seedVersion}
            </p>
          </div>
        </div>
        <div className="row">
          <div className="row__grow">
            <p className="row__title">本地占用</p>
            <p className="row__meta">
              {formatBytes(usage)}
              {usage > LIMITS.STORAGE_WARN_BYTES ? ' · 已接近浏览器上限，建议导出后精简' : ''}
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">导出</h2>
        <p className="muted text-sm" style={{ marginTop: 0 }}>
          导出包含全部分类与卡片的 JSON 文件，可作为备份或迁移到其它设备。
        </p>
        <Button variant="primary" onClick={onExport}>
          <Download size={18} />
          导出 JSON
        </Button>
      </section>

      <section className="panel">
        <h2 className="panel__title">导入</h2>
        <div className="chip-row">
          {(Object.keys(MODE_LABEL) as ImportMode[]).map((item) => (
            <button
              key={item}
              type="button"
              className={item === mode ? 'chip chip--active' : 'chip'}
              aria-pressed={item === mode}
              onClick={() => setMode(item)}
            >
              {MODE_LABEL[item]}
              {item === 'replace' ? '（清空现有）' : '（保留现有）'}
            </button>
          ))}
        </div>
        <label className="btn" style={{ cursor: 'pointer' }}>
          <Upload size={18} />
          选择 JSON 文件
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              void onPickFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
        <p className="field__hint" style={{ marginTop: 8 }}>
          上限 {formatBytes(LIMITS.IMPORT_MAX_BYTES)}，导入前会校验结构与字段规则，任何一张卡片不合法都会整体拒绝。
        </p>
      </section>

      <section className="panel">
        <h2 className="panel__title">维护</h2>
        <p className="muted text-sm" style={{ marginTop: 0 }}>
          恢复到内置内容会覆盖当前所有分类与卡片，操作前会自动备份。
        </p>
        <Button onClick={() => setResetOpen(true)}>
          <RotateCcw size={18} />
          恢复内置内容
        </Button>
      </section>

      {pending ? (
        <Modal
          title="确认导入"
          onClose={() => setPending(null)}
          dismissible={!busy}
          footer={
            <>
              <Button onClick={() => setPending(null)} disabled={busy}>
                取消
              </Button>
              <Button variant="primary" onClick={() => void confirmImport()} disabled={busy}>
                {busy ? '导入中…' : `确认${MODE_LABEL[mode]}`}
              </Button>
            </>
          }
        >
          <p className="modal__body">{pending.fileName}</p>
          <ul className="muted text-sm">
            <li>分类：新增 {pending.plan.categoriesAdded}，更新 {pending.plan.categoriesUpdated}，共 {pending.plan.categoriesTotal}</li>
            <li>卡片：新增 {pending.plan.cardsAdded}，更新 {pending.plan.cardsUpdated}，共 {pending.plan.cardsTotal}</li>
            {mode === 'replace' ? <li>替换模式会移除当前 {pending.plan.cardsRemoved} 张不在文件中的卡片</li> : null}
          </ul>
        </Modal>
      ) : null}

      {resetOpen ? (
        <DangerConfirm
          title="恢复内置内容"
          description={`当前 ${categories.length} 个分类、${cards.length} 张卡片将被内置内容覆盖，请先导出备份。`}
          confirmLabel="确认恢复"
          busy={busy}
          onConfirm={() => void confirmReset()}
          onCancel={() => setResetOpen(false)}
        />
      ) : null}
    </>
  );
}
