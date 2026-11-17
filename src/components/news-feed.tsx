import { tr } from '../lib/i18n';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { repository } from '../lib/repository';

export function NewsFeed() {
    const { data = [], isError } = useQuery({ queryKey: ['questions'], queryFn: () => repository.questions() });
    const news = data.filter(q => q.topic === 'Новости').slice(0, 3);
    if (!news.length || isError) return null;
    return <section className="panel stack"><div className="section-title"><h2>{tr("Новости Birge Bol")}</h2><Link className="text-link" to="/moms?topic=Новости">{tr("Все новости →")}</Link></div>{tr(news.map(q => <Link key={q.id} className="document-row" to={`/moms/questions/${q.id}`}><div><span className="subtle-badge">{tr(q.is_demo ? "новости продукта" : 'Новости продукта')}</span><h3>{tr(q.title.replace(/^Новости: /, ''))}</h3><p>{tr(q.body)}</p></div></Link>))}</section>;
}
