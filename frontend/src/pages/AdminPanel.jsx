import { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';

export default function AdminPanel() {
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [entities, setEntities] = useState([]);
    const [selectedMember, setSelectedMember] = useState('');
    const [selectedEntity, setSelectedEntity] = useState('');
    const [newEntity, setNewEntity] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const membersRes = await axios.get('http://localhost:3001/admin/members', {
                headers: { Authorization: `Bearer ${user.token}` },
            });

            const entitiesRes = await axios.get('http://localhost:3001/admin/entities', {
                headers: { Authorization: `Bearer ${user.token}` },
            });

            setMembers(membersRes.data.members || membersRes.data);
            setEntities(entitiesRes.data.entities || entitiesRes.data);
        } catch {
            setMessage('Erro ao buscar dados');
        }
    }
    async function handleAssociate(e) {
        e.preventDefault();
        setMessage('');

        if (!selectedMember || !selectedEntity) {
            setMessage('Selecione um membro e uma entidade');
            return;
        }

        try {
            await axios.post(
                'http://localhost:3001/admin/associate',
                { userId: selectedMember, entityId: selectedEntity },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setMessage('Associação criada com sucesso');
        } catch (error) {
            setMessage('Erro ao associar');
            console.error(error);
        }
    }


    async function handleAddEntity(e) {
        e.preventDefault();
        setMessage('');
        try {
            await axios.post(
                'http://localhost:3001/admin/entities',
                { name: newEntity },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setMessage('Entidade adicionada com sucesso');
            setNewEntity('');
            fetchData();
        } catch {
            setMessage('Erro ao adicionar entidade');
        }
    }

    return (
      <Container style={{ marginTop: "2rem" }}>
        <h2>Painel Admin</h2>
        {message && <Alert variant="info">{message}</Alert>}
        <h4 className="mt-4">Adicionar nova entidade</h4>
        <Form onSubmit={handleAddEntity} className="mb-4">
          <Form.Group>
            <Form.Label>Nome da nova entidade</Form.Label>
            <Form.Control
              type="text"
              value={newEntity}
              onChange={(e) => setNewEntity(e.target.value)}
              placeholder="Digite o nome da entidade"
              required
            />
          </Form.Group>
          <Button type="submit" className="mt-2">
            Adicionar Entidade
          </Button>
        </Form>
        <h4>Associar membro a entidade</h4>
        <Form onSubmit={handleAssociate}>
          <Form.Group className="mb-3">
            <Form.Label>Membro</Form.Label>
            <Form.Select
              onChange={(e) => setSelectedMember(e.target.value)}
              required
            >
              <option value="">Selecione um membro</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name} ({m.email})
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Entidade</Form.Label>
            <Form.Select
              onChange={(e) => setSelectedEntity(e.target.value)}
              required
            >
              <option value="">Selecione uma entidade</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Button type="submit">Associar</Button>
        </Form>
        <Footer />
      </Container>
    );
}
